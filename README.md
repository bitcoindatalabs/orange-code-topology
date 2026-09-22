# 🟧 Bitcoin Core Code Topology

An interactive, WebGL-accelerated structural map of the **Bitcoin Core (`bitcoin/src`) C++ codebase**, mapped entirely from internal `#include` dependencies.

Part of the **[Bitcoin Data Labs](https://bitcoindatalabs.org)** initiative.

---

## 🌟 Overview

Understanding the architectural topology of Bitcoin Core can be daunting for new developers and researchers. **Bitcoin Core Code Topology** models the C++ codebase as a dynamic network graph where:
* **Nodes**: Represent C++ source files (`.cpp`, `.h`, `.hpp`).
* **Edges**: Represent explicit internal `#include` statements between files.
* **Subsystems (Clusters)**: Extracted automatically using the **Louvain modularity algorithm** to group tightly coupled code modules (e.g., Consensus, P2P Validation, Wallet, RPC, Crypto, Script).

Built with **Sigma.js** and **Graphology** for high-performance WebGL rendering capable of fluidly exploring thousands of nodes and inter-module connections.

---

## ✨ Features

* **⚡ WebGL Network Visualization**: Smooth zooming, panning, and node dragging powered by Sigma.js & Graphology ForceAtlas2 layout.
* **🎯 Subsystem Clustering**: Modular communities color-coded by architectural responsibility.
* **🔍 Instant File Search**: Search files with fuzzy auto-completion powered by Fuse.js.
* **📊 Module Statistics**: View in-degree (dependents) and out-degree (dependencies) for any node upon click/hover.
* **🎨 Bitcoin Data Labs Design System**: Custom theme styled with glassmorphism, responsive cards, and clean typography.

---

## 📁 Repository Structure

```
orange-code-topology/
├── docs/                      # GitHub Pages Web Application
│   ├── index.html             # Main HTML layout
│   ├── styles.css             # Bitcoin Data Labs styling
│   └── visualization.js       # Sigma.js / Graphology interaction logic
├── scripts/                   # Data processing pipeline
│   ├── extract_dependencies.py # Scans C++ source tree for #include directives
│   ├── build_graph.py         # Builds NetworkX graph & computes Louvain clusters
│   └── generate_metadata.py   # Generates node metadata & degree stats
├── data/                      # Output graph datasets
│   ├── bitcoin_includes.json  # Raw dependency map
│   ├── clustered_graph.json   # Nodes, edges, and community IDs
│   └── node_metadata.json     # Graph metrics & subsystem metadata
└── requirements.txt           # Python dependencies for pipeline
```

---

## 🛠️ Regenerating the Dataset

To extract dependencies from a local clone of Bitcoin Core (`bitcoin/src`):

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Extract include dependencies
python3 scripts/extract_dependencies.py --src /path/to/bitcoin/src --out data/bitcoin_includes.json

# 3. Build graph & run Louvain clustering
python3 scripts/build_graph.py

# 4. Generate node metadata
python3 scripts/generate_metadata.py
```

---

## 🔗 Live Site

The interactive map is hosted on GitHub Pages:
👉 **[bitcoindatalabs.org/orange-code-topology](https://bitcoindatalabs.org/orange-code-topology/)**

---

## 📜 License

MIT License. Developed as part of the Bitcoin Data Labs suite.
