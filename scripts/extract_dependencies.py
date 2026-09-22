import os
import re
import json
import argparse
from pathlib import Path

def extract_includes(src_dir):
    """
    Scans the given source directory for C/C++ files and extracts local #include dependencies.
    Returns a dictionary mapping file paths (relative to src_dir) to a list of included file paths.
    """
    include_pattern = re.compile(r'^\s*#include\s+["<]([^">]+)[">]')
    
    dependencies = {}
    src_path = Path(src_dir)
    
    # Extensions to scan
    valid_extensions = {'.cpp', '.h', '.c', '.hpp', '.cc'}
    
    for root, _, files in os.walk(src_dir):
        for file in files:
            path = Path(root) / file
            if path.suffix not in valid_extensions:
                continue
                
            try:
                rel_path = path.relative_to(src_path).as_posix()
            except ValueError:
                continue
                
            dependencies[rel_path] = []
            
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    for line in f:
                        match = include_pattern.match(line)
                        if match:
                            included_file = match.group(1)
                            # Normalize path relative to the file's own directory
                            # In Bitcoin Core, many includes are relative to the src directory, 
                            # but some are relative to the current file. 
                            # Let's try to resolve it. If it doesn't exist relative to src, 
                            # maybe it exists relative to the file. For simplicity, we can just record the string.
                            # But to build a graph, we need canonical paths.
                            
                            # Let's check if it exists relative to src/
                            candidate_from_src = src_path / included_file
                            if candidate_from_src.exists():
                                dependencies[rel_path].append(included_file)
                            else:
                                # Try relative to the current file's directory
                                candidate_from_file = path.parent / included_file
                                if candidate_from_file.exists():
                                    try:
                                        norm = candidate_from_file.resolve().relative_to(src_path.resolve()).as_posix()
                                        dependencies[rel_path].append(norm)
                                    except ValueError:
                                        # Outside src directory
                                        dependencies[rel_path].append(included_file)
                                else:
                                    # Just append the raw string if we can't find it
                                    dependencies[rel_path].append(included_file)
            except Exception as e:
                print(f"Error reading {path}: {e}")
                
    return dependencies

def main():
    parser = argparse.ArgumentParser(description="Extract C++ #include dependencies")
    parser.add_argument('--src', type=str, required=True, help="Path to the source code directory (e.g., bitcoin/src)")
    parser.add_argument('--out', type=str, required=True, help="Path to the output JSON file")
    
    args = parser.parse_args()
    
    deps = extract_includes(args.src)
    
    # Format for graph generation
    nodes = set(deps.keys())
    for v in deps.values():
        nodes.update(v)
        
    nodes_list = [{"id": n, "label": Path(n).name, "path": n} for n in sorted(nodes)]
    edges_list = [{"source": k, "target": tgt} for k, v in deps.items() for tgt in v]
    
    graph_data = {
        "nodes": nodes_list,
        "edges": edges_list
    }
    
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, indent=2)
        
    print(f"Extracted dependencies: {len(nodes_list)} nodes, {len(edges_list)} edges.")
    print(f"Saved to {args.out}")

if __name__ == "__main__":
    main()
