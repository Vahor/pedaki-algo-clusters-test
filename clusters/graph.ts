import * as fs from 'fs'
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import {renderToPNG} from 'graphology-canvas/node';
import {circlepack} from "graphology-layout";
import iwanthue from "iwanthue";

type Data = {
    id: string
    friends: string[]
    gender: 'Make' | 'Female'
    options: {
        languages: string[]
        specialization: string[]
    }
}


const edgeName = (a: string, b: string, suffix = "") => {
    return `${a}-${b}-${suffix}`;
}

const orderEdges = (a: string, b: string) => {
    if (a < b) return [a, b];
    return [b, a];
}

const renderGraph = (graph: any, name = "out-graph.png") => {
    circlepack.assign(graph, {
        hierarchyAttributes: ['community'],
    });
    renderToPNG(graph, name, {
        padding: 20,
        width: 2048,
        height: 2048,
        nodes: {
            reducer: (settings, node, attributes) => {
                // different color for each cluster
                const community = graph.getNodeAttribute(node, 'community');
                const color = colors[community % colors.length];
                let size = nodeSize.get(node);
                if (size === undefined) {
                    size = graph.inDegree(node) / 10 + 1;
                    nodeSize.set(node, size);
                }
                return {
                    type: attributes.type || 'circle',
                    label: "node",
                    x: attributes.x,
                    y: attributes.y,
                    size: size,
                    color: color,
                };
            }
        },
        edges: {
            reducer: (settings, edge, attributes) => {
                const opacity = Math.max(0.3, Math.min(0.9, attributes.weight / 20));

                return {
                    type: 'line',
                    size: opacity,
                    color: `rgba(0, 0, 0, ${opacity})`,
                };
            }
        }
    }, () => {
        console.log(`Rendered graph to ${name}!`);
    });
};


//////////

const raw = fs.readFileSync('data.json', 'utf8')
let students = JSON.parse(raw) as Data[]

const graph = new Graph({
    multi: true,
});

students.forEach((student) => {
    graph.addNode(student.id);
});

// Transform data
// students = students.map((student) => {
//     student.options.languages.push('German');
//     if (student.options.languages.includes('Spanish')) {
//         student.options.languages = student.options.languages.filter((language) => language !== 'Spanish');
//     }
//     //same with greek
//     if (student.options.languages.includes('Greek')) {
//         student.options.languages = student.options.languages.filter((language) => language !== 'Greek');
//     }
//     return student;
// });


students.forEach((student) => {
    // student.friends.forEach(friend => {
    //     const edge = edgeName(student.id, friend, "friend");
    //     graph.addDirectedEdgeWithKey(edge, student.id, friend, {weight: 5});
    // });

    // Add edges to all students with the same languages
    students.forEach((otherStudent) => {
        if (student.id === otherStudent.id) return;
        if (student.id > otherStudent.id) return;
        const [a, b] = orderEdges(student.id, otherStudent.id);
        const edge = edgeName(a, b, "language");

        const intersection = otherStudent.options.languages.filter(language => student.options.languages.includes(language));
        if (intersection.length > 0) {
            graph.addEdgeWithKey(edge, a, b, {weight: intersection.length});
        }
    });

    // Add edges to all students with the same specialization
    students.forEach((otherStudent) => {
        if (student.id === otherStudent.id) return;
        if (student.id > otherStudent.id) return;
        const [a, b] = orderEdges(student.id, otherStudent.id);
        const edge = edgeName(a, b, "specialization");

        const intersection = otherStudent.options.specialization.filter(language => student.options.specialization.includes(language));
        if (intersection.length > 0) {
            graph.addEdgeWithKey(edge, a, b, {weight: intersection.length});
        }
    });
});


louvain.assign(graph, {
    nodeCommunityAttribute: "community",
    resolution: 1.2,
    // getEdgeWeight: null
});

// graph layout


const clusters = new Map<number, Data[]>();
graph.forEachNode(node => {
    const community = graph.getNodeAttribute(node, 'community');
    const student = students.find(student => student.id === node);

    if (student === undefined) {
        console.error(`Student ${node} not found`);
        return;
    }

    if (clusters.has(community)) {
        clusters.get(community)!.push(student);
    } else {
        clusters.set(community, [student]);
    }
});


const colors = iwanthue(clusters.size);
const nodeSize = new Map<string, number>();

renderGraph(graph);


console.log(`Found ${clusters.size} clusters!`)
fs.rmSync('./graph-output', {force: true, recursive: true});
fs.mkdirSync('./graph-output');
clusters.forEach((cluster, index) => {
    const dataPoints = cluster;
    const clusterData = JSON.stringify(dataPoints);
    fs.writeFileSync(`./graph-output/${index}.json`, clusterData);
    const community = graph.getNodeAttribute(dataPoints[0].id, 'community');
    console.log(`Cluster ${index} size: ${dataPoints.length}, community: ${community}, color: ${colors[community % colors.length]}`);
});

// Post-processing
const minClusterSize = 20;
const maxClusterSize = 25;

function adjustClusterSizes(communities: Data[][], edges: string[], maxDepth: number): Data[][] {
    const mergedCommunities = [];
    const queue: Data[][] = [...communities]; // Create a queue with initial communities

    while (queue.length > 0) {
        const community = queue.pop()!; // Pop a community from the queue

        // Check if the cluster size is smaller than the minimum
        if (community.length < minClusterSize) {
            // Find neighboring clusters to merge with
            const nearestCluster = findNearestCluster(community, queue, edges);
            if (nearestCluster === undefined) {
                mergedCommunities.push(community);
                continue;
            }

            const mergedCluster = mergeClusters(community, nearestCluster);

            // remove the merged clusters from the queue
            queue.splice(queue.indexOf(nearestCluster), 1);

            queue.push(mergedCluster);
        }
        // Check if the cluster size is larger than the maximum
        else if (community.length > maxClusterSize) {
            // Split the current cluster into smaller subclusters
            const subclusters = splitCluster(community);

            mergedCommunities.push(...subclusters);
        } else {
            mergedCommunities.push(community);
        }
    }

    // Check if there are still clusters that are too small
    const invalidClusters = mergedCommunities.filter(community => community.length < minClusterSize || community.length > maxClusterSize);
    if (invalidClusters.length > 0 && maxDepth > 0) {
        console.log(`Found ${invalidClusters.length} invalid clusters!`)
        // Recursively adjust cluster sizes
        // return adjustClusterSizes(mergedCommunities, edges, maxDepth - 1);
    }

    return mergedCommunities;
}

function findNearestCluster(community: Data[], communities: Data[][], edges: string[]) {
    let nearestCluster: Data[] | undefined;
    let commonNodesCount = 0;

    for (const otherCommunity of communities) {
        if (otherCommunity !== community) {
            const commonNodes = otherCommunity.filter(dataPoint => {
                return community.some(dataPoint2 => {
                    const [a, b] = orderEdges(dataPoint.id, dataPoint2.id);
                    return edges.includes(edgeName(a, b));
                });
            });

            if (commonNodes.length > commonNodesCount) {
                nearestCluster = otherCommunity;
                commonNodesCount = commonNodes.length;
            }
        }
    }

    return nearestCluster;
}

function mergeClusters(cluster: Data[], neighborClusters: Data[]) {
    return [...cluster, ...neighborClusters];
}

function splitCluster(cluster: Data[]): Data[][] {
    const numSubclusters = Math.ceil(cluster.length / maxClusterSize);
    const subclusterSize = Math.ceil(cluster.length / numSubclusters);

    const subclusters = [];

    for (let i = 0; i < numSubclusters; i++) {
        const startIdx = i * subclusterSize;
        const endIdx = startIdx + subclusterSize;
        const subcluster = cluster.slice(startIdx, endIdx);
        subclusters.push(subcluster);
    }

    return subclusters;
}

// Adjust cluster sizes using post-processing
const communities = Array.from(clusters.values());
const edges = Array.from(graph.edges());
const adjustedCommunities = adjustClusterSizes(communities, edges, 20);


// create a new graph with the adjusted clusters
const adjustedGraph = new Graph();
adjustedCommunities.forEach((community) => {
    community.forEach(student => {
        adjustedGraph.addNode(String(student.id), {
            community: graph.getNodeAttribute(student.id, 'community'),
        });
    });

    // add edges between all nodes in the community
    for (let i = 0; i < community.length; i++) {
        for (let j = i + 1; j < community.length; j++) {
            const [a, b] = orderEdges(community[i].id, community[j].id);

            adjustedGraph.updateEdgeWithKey(edgeName(a, b), a, b, () => ({
                weight: 8,
            }));
        }
    }
});

renderGraph(adjustedGraph, 'out-graph-adjusted.png');

console.log('---')
console.log(`Found ${adjustedCommunities.length} clusters!`)
fs.rmSync('./graph-output_adjusted', {force: true, recursive: true});
fs.mkdirSync('./graph-output_adjusted');
adjustedCommunities.forEach((cluster, index) => {
    const dataPoints = cluster;
    const clusterData = JSON.stringify(dataPoints);
    fs.writeFileSync(`./graph-output_adjusted/${index}.json`, clusterData);
    const community = graph.getNodeAttribute(dataPoints[0].id, 'community');
    console.log(`Cluster ${index} size: ${dataPoints.length}, community: ${community}, color: ${colors[community % colors.length]}`);
});