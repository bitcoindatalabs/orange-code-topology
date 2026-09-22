import json
import argparse
from pathlib import Path
import networkx as nx
import community.community_louvain as community_louvain

def build_and_cluster(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    G = nx.DiGraph()
    
    # Add nodes
    for node in data['nodes']:
        G.add_node(node['id'], **node)
        
    # Add edges
    for edge in data['edges']:
        G.add_edge(edge['source'], edge['target'])
        
    # Convert to undirected graph for community detection
    G_undirected = G.to_undirected()
    
    # Run Louvain
    print("Running Louvain clustering...")
    partition = community_louvain.best_partition(G_undirected)
    
    # Calculate degree centrality to use as node size
    print("Calculating degree centrality...")
    degree_cent = nx.degree_centrality(G)
    
    # Update nodes with cluster and metric data
    for node_id in G.nodes():
        G.nodes[node_id]['cluster'] = partition.get(node_id, -1)
        G.nodes[node_id]['degree'] = degree_cent.get(node_id, 0.0)
        G.nodes[node_id]['in_degree'] = G.in_degree(node_id)
        G.nodes[node_id]['out_degree'] = G.out_degree(node_id)

    # Format output
    nodes_out = []
    for node_id, attrs in G.nodes(data=True):
        nodes_out.append({
            "id": node_id,
            "label": attrs.get('label', node_id),
            "cluster": attrs.get('cluster'),
            "degree": attrs.get('degree'),
            "in_degree": attrs.get('in_degree'),
            "out_degree": attrs.get('out_degree')
        })
        
    edges_out = data['edges']
    
    output_data = {
        "nodes": nodes_out,
        "edges": edges_out
    }
    
    out_path = Path(output_file)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)
        
    print(f"Graph clustering complete. Output saved to {output_file}")
    
    # Print cluster stats
    clusters = {}
    for n in nodes_out:
        c = n['cluster']
        clusters[c] = clusters.get(c, 0) + 1
        
    print(f"Found {len(clusters)} clusters.")
    # Top clusters
    top_clusters = sorted(clusters.items(), key=lambda x: x[1], reverse=True)[:10]
    print("Top 10 clusters by node count:")
    for c, count in top_clusters:
        print(f"Cluster {c}: {count} nodes")

def main():
    parser = argparse.ArgumentParser(description="Build graph and cluster nodes")
    parser.add_argument('--input', type=str, required=True, help="Input JSON file with nodes and edges")
    parser.add_argument('--output', type=str, required=True, help="Output JSON file with clustered graph")
    
    args = parser.parse_args()
    build_and_cluster(args.input, args.output)
    
if __name__ == "__main__":
    main()
