import json
import os

def generate_description(filename):
    lower = filename.lower()
    if 'qt/' in lower or lower.startswith('q'):
        return "Qt GUI component for the Bitcoin Core graphical interface."
    if 'wallet/' in lower:
        return "Part of the Bitcoin Core wallet implementation."
    if 'rpc/' in lower:
        return "RPC (Remote Procedure Call) server component."
    if 'consensus/' in lower:
        return "Bitcoin consensus rules and validation logic."
    if 'crypto/' in lower:
        return "Cryptographic primitive or algorithm."
    if 'secp256k1/' in lower:
        return "libsecp256k1 elliptic curve cryptography library."
    if 'leveldb/' in lower:
        return "LevelDB key-value store component."
    if 'test/' in lower or 'fail' in lower:
        return "Unit test or integration test."
    if 'bench/' in lower or 'benchmark' in lower:
        return "Performance benchmark."
    if 'net' in lower:
        return "P2P networking layer."
    if 'zmq/' in lower:
        return "ZeroMQ notification interface."
    if 'script/' in lower:
        return "Bitcoin script interpreter and evaluation."
    if 'policy/' in lower:
        return "Mempool and transaction relay policy."
    if 'primitives/' in lower:
        return "Fundamental data structures (Block, Transaction)."
    if 'util/' in lower:
        return "Utility functions and helpers."
    if 'chain' in lower:
        return "Blockchain state and block tree."
    if 'node/' in lower:
        return "Node initialization and lifecycle."
    if 'miner' in lower:
        return "Block assembly and mining."
    if 'validation' in lower:
        return "State validation and block processing."
    if 'ipc/' in lower or 'capnp/' in lower:
        return "Inter-process communication (IPC) and serialization."
    if 'univalue/' in lower:
        return "UniValue JSON library component."
    if 'minisketch/' in lower:
        return "Minisketch library for set reconciliation."
    if 'crc32c/' in lower:
        return "CRC32C checksum library."
    
    return "Bitcoin Core C++ source file."

def main():
    graph_path = os.path.join(os.path.dirname(__file__), '../docs/data/clustered_graph.json')
    docs_out_path = os.path.join(os.path.dirname(__file__), '../docs/data/node_metadata.json')
    
    with open(graph_path, 'r') as f:
        data = json.load(f)
        
    metadata = {}
    for node in data.get('nodes', []):
        node_id = node['id']
        metadata[node_id] = {
            "description": generate_description(node_id),
            "github_url": f"https://github.com/bitcoin/bitcoin/tree/master/src/{node_id}" if '/' in node_id or node_id.endswith('.cpp') or node_id.endswith('.h') else f"https://github.com/bitcoin/bitcoin/search?q={node_id}"
        }
        
    os.makedirs(os.path.dirname(docs_out_path), exist_ok=True)
    with open(docs_out_path, 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"Generated metadata for {len(metadata)} nodes at {docs_out_path}")

if __name__ == "__main__":
    main()
