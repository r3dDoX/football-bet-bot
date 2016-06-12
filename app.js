const http = require('http');
const cheerio = require('cheerio');

const team1 = process.argv[2];
const team2 = process.argv[3];

const iterations = 100000;
const correction = 10;// to get even numbers throughout calculation (js numbers...)
const goalQuantifier = 0.0045 * correction;
const typicalGoals = 2.6 * correction;
const goalTriesQuantifier = 6;

const teams = [
    'Albania',
    'Austria',
    'Czechia',
    'Croatia',
    'Belgium',
    'England',
    'France',
    'Germany',
    'Hungary',
    'Iceland',
    'Italy',
    'Ireland',
    'Northern Ireland',
    'Poland',
    'Portugal',
    'Romania',
    'Russia',
    'Slovakia',
    'Spain',
    'Sweden',
    'Switzerland',
    'Turkey',
    'Ukraine',
    'Wales'
];

function getCurrentEloRatings() {
    return new Promise((resolve, reject) => {
        http.get({
            host: 'eloratings.net',
            path: '/europe.html'
        }, (response) => {
            let body = '';

            response.on('data', data => body += data);
            response.on('end', () => resolve(body));
            response.on('error', error => reject(error));
            response.on('timeout', error => reject(error));
        });
    });
}

function getAverageStrength($) {
    return teams
            .map(teamName => Number($(`table a:contains(${teamName})`).parents('tr').find('td:nth-child(4)').html()))
            .reduce((sum, teamStrength) => sum + teamStrength, 0) / teams.length;
}

function calculateGoals(triesArray) {
    return triesArray
        .map(() => Math.ceil(Math.random() * 6))
        .reduce((sum, actTryResult) => actTryResult === 6 ? sum + 1 : sum, 0);
}

getCurrentEloRatings().then(data => {
    const $ = cheerio.load(data);

    const eloRating1 = Number($('td:nth-child(4)', $(`table a:contains(${team1})`).parents('tr')).html());
    const eloRating2 = Number($('td:nth-child(4)', $(`table a:contains(${team2})`).parents('tr')).html());

    if (eloRating1.length === 0) {
        throw new Error(`Couldn't find ELO Rating for team ${team1}`);
    }
    if (eloRating2.length === 0) {
        throw new Error(`Couldn't find ELO Rating for team ${team2}`);
    }

    const averageStrength = Math.round(getAverageStrength($));
    const averageGoals1 = Math.round((eloRating1 - averageStrength) * goalQuantifier);
    const averageGoals2 = Math.round((eloRating2 - averageStrength) * goalQuantifier);

    const typicalGoalShare2 = (typicalGoals - (averageGoals1 - averageGoals2)) / 2;
    const typicalGoalShare1 = typicalGoals - typicalGoalShare2;

    const goalTries1 = Array.apply(null, Array(Math.ceil((typicalGoalShare1 * goalTriesQuantifier) / correction)));
    const goalTries2 = Array.apply(null, Array(Math.ceil((typicalGoalShare2 * goalTriesQuantifier) / correction)));

    const summedResults = Array.apply(null, Array(iterations))
        .map(() => {
            return {
                result1: calculateGoals(goalTries1),
                result2: calculateGoals(goalTries2)
            };
        })
        .reduce((sum, actResult) => {
            const index = [actResult.result1, actResult.result2].join('');
            if (sum[index]) {
                sum[index].count += 1;
            } else {
                sum[index] = {
                    result: `${actResult.result1} - ${actResult.result2}`,
                    count: 1
                };
            }
            return sum;
        }, {});

    return Object.getOwnPropertyNames(summedResults).reduce((bestResult, actResultIndex) => {
        const actResult = summedResults[actResultIndex];
        return (bestResult.count <= actResult.count) ? actResult : bestResult;
    }, {count: 0});
})
    .then(bestResult => {
        console.log(`The most likely result is: ${bestResult.result}.`);
        console.log(`Out of ${iterations} tries, it happened ${bestResult.count} times`);
    })
    .catch(error => console.error(error));