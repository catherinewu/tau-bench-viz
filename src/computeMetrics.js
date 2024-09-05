const fs = require('fs');
const argparse = require('argparse');

function readResultsFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function displayMetrics(results) {
    const numTrials = new Set(results.map(r => r.trial)).size;
    const rewards = results.map(r => r.reward);
    const avgReward = rewards.reduce((a, b) => a + b, 0) / rewards.length;

    // c from https://arxiv.org/pdf/2406.12045
    const cPerTaskId = {};
    results.forEach(r => {
        if (!(r.task_id in cPerTaskId)) {
            cPerTaskId[r.task_id] = r.reward;
        } else {
            cPerTaskId[r.task_id] += r.reward;
        }
    });

    const passHatKs = {};
    for (let k = 1; k <= numTrials; k++) {
        let sumTaskPassHatK = 0;
        Object.values(cPerTaskId).forEach(c => {
            sumTaskPassHatK += combination(c, k) / combination(numTrials, k);
        });
        passHatKs[k] = sumTaskPassHatK / Object.keys(cPerTaskId).length;
    }

    // Calculate summary stats on sources of failure
    const failureSources = {};
    results.forEach(r => {
        if (r.reward === 0) {
            let failureSource = "unknown";
            if ("info" in r) {
                const info = r.info;
                if ("source" in info) {
                    failureSource = info.source;
                } else if ("r_actions" in info && info.r_actions === false) {
                    failureSource = "r_actions_false";
                } else if ("outputs" in info) { // this one needs to be last
                    const outputs = info.outputs;
                    if (Object.values(outputs).some(value => !value)) {
                        failureSource = "missing_outputs";
                    }
                }
            }

            failureSources[failureSource] = (failureSources[failureSource] || 0) + 1;
            if (failureSource === "unknown") {
                console.log("\nUnknown failure case:");
                console.log(JSON.stringify(r.info, null, 2));
                console.log();
            }
        }
    });

    const totalFailures = Object.values(failureSources).reduce((a, b) => a + b, 0);

    // Return metrics as a key-value dictionary
    const metrics = {
        "Average Reward": avgReward.toFixed(4),
        "Pass^k": Object.fromEntries(
            Object.entries(passHatKs).map(([k, v]) => [`k=${k}`, v.toFixed(4)])
        ),
        "Failure Sources": Object.fromEntries(
            Object.entries(failureSources)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => [
                    source,
                    `${count} (${((count / totalFailures) * 100).toFixed(2)}%)`
                ])
        )
    };
    return metrics;
}

function combination(n, k) {
    if (k === 0 || k === n) return 1;
    return combination(n - 1, k - 1) * n / k;
}

function main() {
    const parser = new argparse.ArgumentParser({
        description: "Compute metrics from a results file"
    });
    parser.add_argument("results_file", { type: String, help: "Path to the results JSON file to analyze" });
    const args = parser.parse_args();

    const results = readResultsFile(args.results_file);
    displayMetrics(results);
}

if (require.main === module) {
    main();
}
