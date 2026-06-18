import sys

def compress_js(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    output_lines = []
    for line in lines:
        cleaned = line.strip()
        # Remove single-line comments
        if cleaned.startswith('//'):
            continue
        # Strip inline comment on lines that aren't URLs
        if '//' in line and not ('http://' in line or 'https://' in line):
            parts = line.split('//', 1)
            line = parts[0]
            cleaned = line.strip()
            
        if not cleaned:
            continue
        output_lines.append(line)
        
    # Now merge lines ending in brackets or operators
    merged_lines = []
    i = 0
    n = len(output_lines)
    while i < n:
        line = output_lines[i]
        cleaned = line.strip()
        
        # Merge criteria:
        # If line ends with certain symbols or starts with certain symbols
        while i + 1 < n:
            next_line = output_lines[i+1]
            next_cleaned = next_line.strip()
            
            should_merge = False
            # 1. Merge closing tags, brackets, parens
            if next_cleaned in ('}', '}', '};', '}', ']', '];', ')', ');', '/>', '});', '};'):
                should_merge = True
            # 2. Merge opening brackets/parens/operators
            elif cleaned.endswith(('{', '[', '(', ',', '=>', '||', '&&', '?', ':')):
                should_merge = True
            # 3. Merge short returns/consts/lets
            elif len(cleaned) < 30 and (cleaned.startswith('return ') or cleaned.startswith('const ') or cleaned.startswith('let ') or cleaned.startswith('set')):
                should_merge = True
            # 4. Merge if next line starts with a comma or operator
            elif next_cleaned.startswith(('.', ',', '&&', '||', '?', ':')):
                should_merge = True
                
            if should_merge:
                line = line.rstrip('\r\n') + " " + next_line.lstrip()
                cleaned = line.strip()
                i += 1
            else:
                break
        merged_lines.append(line)
        i += 1
        
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(merged_lines)
    print(f"Compressed {n} lines down to {len(merged_lines)} lines.")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 compress_js.py input.js output.js")
    else:
        compress_js(sys.argv[1], sys.argv[2])
