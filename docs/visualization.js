document.addEventListener("DOMContentLoaded", async () => {
    const clusterNames = {
        0: "Core & Networking",
        1: "Qt GUI",
        2: "Dependencies (LevelDB, secp256k1)",
        3: "Tests (Address & Core)",
        4: "Wallet & Core Utils",
        5: "Benchmarks & Core",
        6: "Hardware & CRC32C",
        7: "IPC & Cap'n Proto",
        8: "IPC (Echo/Mining)",
        9: "Univalue Tests",
        10: "Multiprocess",
        11: "LevelDB Core",
        12: "LevelDB Include",
        13: "LevelDB Port",
        14: "LevelDB Table",
        15: "LevelDB Posix Env",
        16: "LevelDB Win Env",
        17: "Minisketch",
        18: "Univalue Include"
    };

    const CLUSTER_COLORS = {
        0: '#b4a05a',       
        1: '#a56bb1',       
        2: '#5b9c5b',       
        3: '#cc79a7',       
        4: '#56b4e9',       
        5: '#e69f00',       
        6: '#009e73',       
        7: '#d55e00',       
        8: '#0072b2',       
        9: '#f0e442',       
        10: '#b4a05a',
        11: '#a56bb1',
        12: '#5b9c5b',
        13: '#cc79a7',
        14: '#56b4e9',
        DEFAULT: '#999999'  
    };

    function getNodeColor(cluster) {
        if (cluster === undefined || cluster === null) return CLUSTER_COLORS.DEFAULT;
        const colorIndex = cluster % 15;
        return CLUSTER_COLORS[colorIndex] || CLUSTER_COLORS.DEFAULT;
    }

    const container = document.getElementById("viz");
    const loadingIndicator = document.getElementById("loading-indicator");
    const tooltip = document.getElementById("tooltip");
    
    let graph = null;
    let renderer = null;
    let fuse = null;
    let hoveredNode = null;
    let selectedNode = null;
    let metadata = {};
    
    let activeClusterFilters = new Set();
    let allClusters = new Set();
    let searchQuery = "";
    
    window.checkAllClusters = function() {
        activeClusterFilters = new Set(allClusters);
        applyFilters();
        populateSidebars();
    };

    window.uncheckAllClusters = function() {
        activeClusterFilters.clear();
        applyFilters();
        populateSidebars();
    };

    window.toggleClusterFilter = function(clusterId) {
        if (activeClusterFilters.has(clusterId)) {
            activeClusterFilters.delete(clusterId);
        } else {
            activeClusterFilters.add(clusterId);
        }
        applyFilters();
        populateSidebars();
    };

    window.focusNode = function(nodeId) {
        if (!graph.hasNode(nodeId)) return;
        
        selectedNode = nodeId;
        const pos = renderer.getNodeDisplayData(nodeId);
        if (pos) {
            renderer.getCamera().animate({ x: pos.x, y: pos.y, ratio: 0.5 }, { duration: 300 });
        }
        renderer.refresh();
        openNodeDetails(nodeId);
    };

    loadingIndicator.style.display = 'block';

    try {
        const [graphRes, metaRes] = await Promise.all([
            fetch("data/clustered_graph.json"),
            fetch("data/node_metadata.json").catch(() => ({ json: () => ({}) }))
        ]);
        
        const data = await graphRes.json();
        metadata = await metaRes.json();
        
        document.getElementById("node-count").textContent = data.nodes.length.toLocaleString();
        document.getElementById("edge-count").textContent = data.edges.length.toLocaleString();
        
        const clusters = new Set(data.nodes.map(n => n.cluster));
        document.getElementById("cluster-count").textContent = clusters.size;
        
        allClusters = clusters;
        activeClusterFilters = new Set(allClusters);
        
        graph = new graphology.Graph({ multi: false, type: 'directed' });
        
        if (window.Fuse) {
            fuse = new Fuse(data.nodes, {
                keys: ['label'],
                threshold: 0.3
            });
        }
        
        // Add Nodes
        data.nodes.forEach((node, i) => {
            if (!node.id) return;
            const angle = (i * 2 * Math.PI) / data.nodes.length;
            const radius = 100 * Math.random();
            
            graph.addNode(node.id, {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                size: Math.max(2, (node.degree * 25)),
                label: node.label,
                color: getNodeColor(node.cluster),
                cluster: node.cluster,
                in_degree: node.in_degree,
                out_degree: node.out_degree,
                hidden: false
            });
        });
        
        // Add Edges
        data.edges.forEach(edge => {
            if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
                if (!graph.hasEdge(edge.source, edge.target)) {
                    graph.addEdge(edge.source, edge.target, {
                        size: 1,
                        color: 'rgba(0, 0, 0, 0.1)',
                        hidden: false
                    });
                }
            }
        });
        
        const sensibleSettings = {
            gravity: 0.5,
            scalingRatio: 2,
            barnesHutOptimize: true,
            barnesHutTheta: 0.8,
            edgeWeightInfluence: 0,
            outboundAttractionDistribution: true
        };
        graphologyLibrary.layoutForceAtlas2.assign(graph, {
            iterations: 150,
            settings: sensibleSettings
        });
        
        loadingIndicator.style.display = 'none';
        
        renderer = new Sigma(graph, container, {
            renderEdgeLabels: false,
            defaultEdgeType: 'arrow',
            labelFont: 'Segoe UI',
            labelSize: 12,
            labelWeight: '500',
            labelColor: { color: '#333333' },
            nodeReducer: (node, data) => {
                const res = { ...data };
                
                // Dim non-neighbors if a node is selected
                if (selectedNode && selectedNode !== node && !graph.hasEdge(selectedNode, node) && !graph.hasEdge(node, selectedNode)) {
                    res.color = '#e2e8f0';
                    res.zIndex = 0;
                } else if (selectedNode === node) {
                    res.highlighted = true;
                    res.zIndex = 2;
                }
                
                // Hover overrides
                if (hoveredNode && hoveredNode !== node && !graph.hasEdge(hoveredNode, node) && !graph.hasEdge(node, hoveredNode)) {
                    res.color = '#e2e8f0';
                    res.zIndex = 0;
                } else if (hoveredNode === node) {
                    res.highlighted = true;
                    res.zIndex = 2;
                }
                
                if (res.hidden) {
                    res.color = 'transparent';
                    res.label = '';
                    res.size = 0;
                }
                
                return res;
            },
            edgeReducer: (edge, data) => {
                const res = { ...data };
                const source = graph.source(edge);
                const target = graph.target(edge);
                
                res.hidden = true;
                res.size = 0;
                res.color = 'rgba(0,0,0,0)';
                res.zIndex = 0;
                
                const isHovered = hoveredNode && (source === hoveredNode || target === hoveredNode);
                const isSelected = selectedNode && (source === selectedNode || target === selectedNode);
                
                if (isHovered) {
                    res.hidden = false;
                    res.color = source === hoveredNode ? 'rgba(247, 147, 26, 0.8)' : 'rgba(100, 147, 255, 0.8)';
                    res.size = 1.5;
                    res.zIndex = 2;
                } 
                else if (isSelected) {
                    res.hidden = false;
                    res.color = source === selectedNode ? 'rgba(247, 147, 26, 0.4)' : 'rgba(100, 147, 255, 0.4)';
                    res.size = 1.0;
                    res.zIndex = 1;
                }
                else if (!hoveredNode && !selectedNode) {
                    res.hidden = false;
                    res.color = 'rgba(0,0,0,0.05)';
                    res.size = 0.5;
                }
                
                if (res.hidden || graph.getNodeAttribute(source, 'hidden') || graph.getNodeAttribute(target, 'hidden')) {
                    res.color = 'transparent';
                    res.size = 0;
                }
                
                return res;
            }
        });
        
        // Tooltip & Interactions
        renderer.on('enterNode', (e) => {
            hoveredNode = e.node;
            showTooltip(e.node, e.event.original.clientX, e.event.original.clientY);
            renderer.refresh();
            document.body.style.cursor = 'pointer';
        });
        
        renderer.on('leaveNode', () => {
            hoveredNode = null;
            hideTooltip();
            renderer.refresh();
            document.body.style.cursor = 'default';
        });
        
        renderer.on('clickNode', (e) => {
            selectedNode = e.node;
            openNodeDetails(e.node);
            const pos = renderer.getNodeDisplayData(e.node);
            if (pos) {
                renderer.getCamera().animate({ x: pos.x, y: pos.y, ratio: 0.5 }, { duration: 300 });
            }
            renderer.refresh();
        });
        
        renderer.on('clickStage', () => {
            selectedNode = null;
            openNodeDetails(null);
            renderer.refresh();
        });
        
        // Render overlays after drawing
        renderer.on('afterRender', () => {
            updateClusterLabels();
        });
        
        // Setup static UI listeners
        setupUIInteractions();
        
        populateSidebars();
        renderer.refresh();
        
    } catch (err) {
        console.error("Error initializing visualization:", err);
        loadingIndicator.innerHTML = `<div style="color: #F87171;">Failed to load data: ${err.message}</div>`;
    }
    
    // --- Convex Hull Utilities ---
    function monotoneChainConvexHull(points) {
        if (points.length <= 2) return points;
        const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
        const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        const lower = [];
        for (let i = 0; i < sorted.length; i++) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) lower.pop();
            lower.push(sorted[i]);
        }
        const upper = [];
        for (let i = sorted.length - 1; i >= 0; i--) {
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) upper.pop();
            upper.push(sorted[i]);
        }
        upper.pop();
        lower.pop();
        return lower.concat(upper);
    }

    function expandHull(hull, padding) {
        if (hull.length < 3) return hull;
        let cx = 0, cy = 0;
        hull.forEach(p => { cx += p.x; cy += p.y; });
        cx /= hull.length;
        cy /= hull.length;
        return hull.map(p => {
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            return { x: p.x + (dx / dist) * padding, y: p.y + (dy / dist) * padding };
        });
    }

    function smoothHull(points, iterations = 3) {
        if (points.length < 3) return points;
        let pts = points;
        for (let iter = 0; iter < iterations; iter++) {
            const result = [];
            const n = pts.length;
            for (let i = 0; i < n; i++) {
                const p0 = pts[i];
                const p1 = pts[(i + 1) % n];
                result.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
                result.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
            }
            pts = result;
        }
        return pts;
    }

    function updateClusterLabels() {
        if (!graph || !renderer) return;
        
        const container = document.getElementById('cluster-labels-container');
        const svgContainer = document.getElementById('cluster-boundaries');
        if (!container || !svgContainer) return;
        
        const groups = {};
        
        graph.forEachNode((node, attrs) => {
            if (attrs.hidden || attrs.cluster === undefined) return;
            
            const groupId = attrs.cluster;
            const groupName = clusterNames[attrs.cluster] || `Cluster ${attrs.cluster}`;
            
            if (!groups[groupId]) {
                groups[groupId] = { name: groupName, nodes: [] };
            }
            groups[groupId].nodes.push(attrs);
        });
        
        container.innerHTML = '';
        let svgHtml = '';
        
        Object.keys(groups).forEach(groupId => {
            const group = groups[groupId];
            if (group.nodes.length < 3) return;
            
            const screenPoints = group.nodes.map(n => renderer.graphToViewport({x: n.x, y: n.y}));
            
            const hull = monotoneChainConvexHull(screenPoints);
            const expandedHull = expandHull(hull, 30);
            const smoothPts = smoothHull(expandedHull, 3);
            
            if (smoothPts.length > 2) {
                const color = getNodeColor(parseInt(groupId));
                const pathData = 'M ' + smoothPts.map(p => `${p.x},${p.y}`).join(' L ') + ' Z';
                
                svgHtml += `<path d="${pathData}" fill="${color}" fill-opacity="0.04" stroke="${color}" stroke-opacity="0.2" stroke-width="2" stroke-linejoin="round" />`;
                
                let minY = Infinity, labelX = 0, labelY = 0;
                smoothPts.forEach(p => {
                    if (p.y < minY) { minY = p.y; labelX = p.x; labelY = p.y; }
                });
                
                const labelDiv = document.createElement('div');
                labelDiv.className = 'cluster-label-overlay';
                labelDiv.style.left = `${labelX}px`;
                labelDiv.style.top = `${labelY - 15}px`;
                
                labelDiv.innerHTML = `
                    <div class="cluster-label-header">
                        <div class="cluster-label-icon" style="background-color: ${color}"></div>
                        <div class="cluster-label-text">${group.name}</div>
                    </div>
                `;
                container.appendChild(labelDiv);
            }
        });
        
        svgContainer.innerHTML = svgHtml;
    }
    
    // --- UI Logic ---
    function showTooltip(nodeId, x, y) {
        if(selectedNode) return; // Hide tooltip if node details are open
        const attrs = graph.getNodeAttributes(nodeId);
        tooltip.style.opacity = 1;
        tooltip.style.display = 'block';
        
        const cName = clusterNames[attrs.cluster] || `Cluster ${attrs.cluster}`;
        
        tooltip.innerHTML = `
            <div class="tooltip-header">${attrs.label}</div>
            <div class="tooltip-layer">${cName}</div>
            <div class="tooltip-metric">
                <span class="tooltip-metric-label">Included By</span>
                <span class="tooltip-metric-value">${attrs.in_degree}</span>
            </div>
            <div class="tooltip-metric">
                <span class="tooltip-metric-label">Includes</span>
                <span class="tooltip-metric-value">${attrs.out_degree}</span>
            </div>
        `;
        
        tooltip.style.left = (x + 15) + "px";
        tooltip.style.top = (y + 15) + "px";
    }
    
    function hideTooltip() {
        tooltip.style.opacity = 0;
        tooltip.style.display = 'none';
    }

    function openNodeDetails(nodeId) {
        const sidebarMain = document.getElementById('sidebar-main');
        const sidebarDetails = document.getElementById('sidebar-details');
        const content = document.getElementById('node-details-content');
        
        if (!nodeId) {
            sidebarMain.style.display = 'flex';
            sidebarDetails.style.display = 'none';
            return;
        }
        
        sidebarMain.style.display = 'none';
        sidebarDetails.style.display = 'flex';
        
        const attrs = graph.getNodeAttributes(nodeId);
        const meta = metadata[nodeId] || { description: "Bitcoin Core C++ source file.", github_url: `https://github.com/bitcoin/bitcoin/search?q=${nodeId}` };
        const cName = clusterNames[attrs.cluster] || `Cluster ${attrs.cluster}`;
        
        const outgoing = [];
        const incoming = [];
        
        graph.forEachOutNeighbor(nodeId, (neighbor, nAttrs) => {
            outgoing.push({id: neighbor, label: nAttrs.label});
        });
        graph.forEachInNeighbor(nodeId, (neighbor, nAttrs) => {
            incoming.push({id: neighbor, label: nAttrs.label});
        });
        
        outgoing.sort((a,b) => a.label.localeCompare(b.label));
        incoming.sort((a,b) => a.label.localeCompare(b.label));
        
        let html = `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; word-break: break-all;">${attrs.label}</div>
                <div style="font-size: 12px; color: var(--primary); font-weight: 600; text-transform: uppercase;">${cName}</div>
            </div>
            
            <div class="info-content" style="margin-bottom: 20px;">
                <p>${meta.description}</p>
                <a href="${meta.github_url}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; font-weight: 500; color: var(--primary); text-decoration: none;">
                    <i class="fab fa-github"></i> View Source on GitHub
                </a>
            </div>
        `;
        
        if (outgoing.length > 0) {
            html += `
                <div class="info-title">Includes (Dependencies)</div>
                <div class="dev-list-scrollable" style="margin-bottom: 20px;">
            `;
            outgoing.forEach(n => {
                html += `<div class="overlap-repo-link" onclick="window.focusNode('${n.id}')">${n.label}</div>`;
            });
            html += `</div>`;
        }
        
        if (incoming.length > 0) {
            html += `
                <div class="info-title">Included By (Dependents)</div>
                <div class="dev-list-scrollable">
            `;
            incoming.forEach(n => {
                html += `<div class="overlap-repo-link" onclick="window.focusNode('${n.id}')">${n.label}</div>`;
            });
            html += `</div>`;
        }
        
        content.innerHTML = html;
        hideTooltip(); // Ensure tooltip disappears when moving to details
    }
    
    function applyFilters() {
        if (!graph || !renderer) return;
        
        let searchMatches = null;
        if (searchQuery.length > 0 && fuse) {
            const results = fuse.search(searchQuery);
            searchMatches = new Set(results.map(r => r.item.id));
        }
        
        graph.forEachNode((node, attrs) => {
            let isHidden = false;
            
            if (searchMatches !== null && !searchMatches.has(node)) {
                isHidden = true;
            }
            
            if (attrs.cluster !== undefined && !activeClusterFilters.has(attrs.cluster)) {
                isHidden = true;
            }
            
            graph.setNodeAttribute(node, 'hidden', isHidden);
        });
        
        renderer.refresh();
    }
    
    function populateSidebars() {
        const clusters = {};
        
        graph.forEachNode((node, attrs) => {
            if (attrs.cluster !== undefined) {
                if (!clusters[attrs.cluster]) {
                    clusters[attrs.cluster] = { 
                        name: clusterNames[attrs.cluster] || `Cluster ${attrs.cluster}`, 
                        count: 0
                    };
                }
                clusters[attrs.cluster].count++;
            }
        });
        
        const maxClusterCount = Math.max(...Object.values(clusters).map(c => c.count), 1);
        const clustersContent = document.getElementById('clusters-list');
        
        if (clustersContent) {
            let html = '';
            Object.keys(clusters)
                .sort((a,b) => clusters[b].count - clusters[a].count)
                .forEach(clusterId => {
                const cluster = clusters[clusterId];
                const color = getNodeColor(parseInt(clusterId));
                const isSelected = activeClusterFilters.has(parseInt(clusterId));
                const barWidth = (cluster.count / maxClusterCount) * 100;
                const circleStyle = isSelected ? `background-color: ${color};` : `border: 2px solid ${color};`;
                
                html += `
                    <div class="list-item ${!isSelected ? 'dimmed' : ''}" onclick="window.toggleClusterFilter(${clusterId})">
                        <div class="cluster-circle" style="${circleStyle}"></div>
                        <div class="list-content-wrapper">
                            <div class="list-label" style="font-size: 13px;">${cluster.name}</div>
                            <div class="list-bar" style="width: ${barWidth}%;"></div>
                        </div>
                    </div>
                `;
            });
            clustersContent.innerHTML = html;
        }
    }

    function setupUIInteractions() {
        document.getElementById('zoom-in').addEventListener('click', () => {
            renderer.getCamera().animatedZoom({ duration: 300 });
        });
        document.getElementById('zoom-out').addEventListener('click', () => {
            renderer.getCamera().animatedUnzoom({ duration: 300 });
        });
        document.getElementById('reset-view').addEventListener('click', () => {
            renderer.getCamera().animatedReset({ duration: 300 });
            selectedNode = null;
            openNodeDetails(null);
            renderer.refresh();
        });
        
        document.getElementById('back-to-main').addEventListener('click', () => {
            selectedNode = null;
            openNodeDetails(null);
            renderer.refresh();
        });
        
        document.getElementById('search-input').addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            applyFilters();
        });

        const accordions = document.querySelectorAll('.accordion-header');
        accordions.forEach(acc => {
            acc.addEventListener('click', function() {
                this.parentElement.classList.toggle('active');
                const content = this.nextElementSibling;
                const icon = this.querySelector('.accordion-arrow');
                if (content.style.display === 'block' || content.style.display === '') {
                    content.style.display = 'none';
                    if(icon) {
                        icon.classList.remove('fa-chevron-up');
                        icon.classList.add('fa-chevron-down');
                    }
                } else {
                    content.style.display = 'block';
                    if(icon) {
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-up');
                    }
                }
            });
        });
    }
});
