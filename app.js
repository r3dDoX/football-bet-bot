const http = require('http');
const cheerio = require('cheerio');

const team1 = process.argv[2];
const team2 = process.argv[3];

const correction = 10;// to get even numbers throughout calculation (js numbers...)
const goalQuantifier = 0.0045 * correction;
const typicalGoals = 2.6 * correction;

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

            response.on('data', (d) => body += d);

            response.on('end', () => resolve(body));
            
            response.on('error', () => reject());
        });
    });
}

function getAverageStrength($) {
    return Math.round(teams
        .map(teamName => Number($(`table a:contains(${teamName})`).parents('tr').find('td:nth-child(4)').html()))
        .reduce((sum, teamStrength) => sum + teamStrength, 0) / teams.length);
}

getCurrentEloRatings().then(data => {
    const $ = cheerio.load(data);
    
    const teamRow1 = $(`table a:contains(${team1})`).parents('tr');
    const teamRow2 = $(`table a:contains(${team2})`).parents('tr');
    const eloRating1 = Number($('td:nth-child(4)', teamRow1).html());
    const eloRating2 = Number($('td:nth-child(4)', teamRow2).html());

    const averageStrength = getAverageStrength($);

    const teamStrength1 = eloRating1 - averageStrength;
    const teamStrength2 = eloRating2 - averageStrength;

    const goalDifference1 = Math.round(teamStrength1 * goalQuantifier);
    const goalDifference2 = Math.round(teamStrength2 * goalQuantifier);

    const goalDifference = goalDifference1 - goalDifference2;
    const likelyGoals2 = (typicalGoals - goalDifference)/2;
    const likelyGoals1 = typicalGoals - likelyGoals2;

    const dice1 = Array.apply(null, Array(Math.ceil((likelyGoals1 * 6)/correction)));
    const dice2 = Array.apply(null, Array(Math.ceil((likelyGoals2 * 6)/correction)));

    const iterations = 100000;
    const calculateGoals = (triesArray) => {
        return triesArray
            .map(() => Math.ceil(Math.random() * 6))
            .reduce((sum, result) => result === 6 ? sum + 1 : sum, 0);
    };
    const summedResults = Array.apply(null, Array(iterations))
        .map(() => {
            return {
                result1: calculateGoals(dice1),
                result2: calculateGoals(dice2)
            };
        })
        .reduce((sum, actResult) => {
            const index = [actResult.result1, actResult.result2].join('');
            if (sum[index]) {
                sum[index].count += 1;
            } else {
                sum[index] = {
                    result: actResult.result1 + ' - ' + actResult.result2,
                    count: 1
                };
            }
            return sum;
        }, {});

    const bestResult = Object.getOwnPropertyNames(summedResults).reduce((bestResult, actPropertyName) => {
        const actResult = summedResults[actPropertyName];
        if (bestResult.count < actResult.count) {
            return actResult;
        }
        return bestResult;
    }, {count:0});

    console.log(bestResult);
});