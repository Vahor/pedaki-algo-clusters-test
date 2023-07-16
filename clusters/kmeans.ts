import * as fs from 'fs'
import Graph from 'graphology';
import {kmeans} from 'ml-kmeans'

type Data = {
    id: string
    friends: string[]
    gender: 'Male' | 'Female'
    options: {
        languages: string[]
        specialization: string[]
    }
}

const raw = fs.readFileSync('data.json', 'utf8')
let students = JSON.parse(raw) as Data[]
const friendsGroupsCount = 5;
const K = 3 // Number of clusters

function hashCode(str: string) {
    let hash = 0;
    if (str.length === 0) {
        return hash;
    }
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
}

const graph = new Graph({});

students.forEach((student, index) => {
    graph.addNode(index.toString());
});


const allLanguages = [
    ...new Set(students.reduce((acc, student) => {
            return acc.concat(student.options.languages);
        }, [] as string[])
    )
];
const allSpecializations = [
    ...new Set(
        students.reduce((acc, student) => {
            return acc.concat(student.options.specialization);
        }, [] as string[])
    )
];

const transformData = (data: Data) => {
    // Add connections to other students
    const friendVector = Array(friendsGroupsCount).fill(0);
    data.friends.forEach(friend => {
        const hashIndex = Math.abs(hashCode(friend)) % friendsGroupsCount;
        friendVector[hashIndex] = 1;
    });

    const languageVector = allLanguages.map(lang => (data.options.languages.includes(lang) ? 1 : 0));
    const specializationVector = allSpecializations.map(spec => (data.options.specialization.includes(spec) ? 1 : 0));
    const gender = data.gender === 'Female' ? 1 : 0;

    return [
        // ...friendVector,
        ...languageVector,
        ...specializationVector,
        // gender
    ];
}

const vectorizedStudents = students.map(transformData);
console.log(vectorizedStudents[0])


const result = kmeans(vectorizedStudents, K, {
    maxIterations: 100,
    tolerance: 1e-6,
    initialization: 'kmeans++',
    distanceFunction: distance,
});

function distance(p: number[], q: number[]) {
    let d = 0;
    for (let i = 0; i < p.length - 1; i++) {
        d += Math.pow(p[i] - q[i], 2);
    }


    return Math.sqrt(d);
}

const clusterAssignments = result.clusters;

console.log("Iterations:")
console.log(result.iterations);
console.log("Clusters:")
const clusters = {} as { [key: number]: number[] };

for (let i = 0; i < clusterAssignments.length; i++) {
    const clusterIndex = clusterAssignments[i];
    if (!clusters.hasOwnProperty(clusterIndex)) {
        clusters[clusterIndex] = [];
    }

    // Store the index of the data point in the original data
    clusters[clusterIndex].push(i);
}

const clusteredData = {} as { [key: number]: Data[] };

for (const clusterIndex in clusters) {
    const dataPoints = clusters[clusterIndex];
    clusteredData[clusterIndex] = dataPoints.map(index => students[index]);
}


// write all clusters json to ./output/id.json
fs.rmSync('./kmeans', {force: true, recursive: true});
fs.mkdirSync('./kmeans');
for (const clusterIndex in clusteredData) {
    const dataPoints = clusteredData[clusterIndex];
    const clusterData = JSON.stringify(dataPoints);
    fs.writeFileSync(`./kmeans/${clusterIndex}.json`, clusterData);
    console.log(`Cluster ${clusterIndex} size: ${dataPoints.length}`);
}

// same for vectorized data
fs.rmSync('./kmeans_vectorized', {force: true, recursive: true});
fs.mkdirSync('./kmeans_vectorized');
for (const data in vectorizedStudents) {
    const clusterData = JSON.stringify(vectorizedStudents[data]);
    fs.writeFileSync(`./kmeans_vectorized/${data}.json`, clusterData);
}

