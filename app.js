const http = require('http');
const cheerio = require('cheerio');

const team1 = process.argv[2];
const team2 = process.argv[3];

const correction = 10;
const goalQuantifier = 0.0045 * correction;
const typicalGoals = 2.6 * correction;

const teams = [
    'France',
    'Romania',
    'Albania',
    'Switzerland',
    'England',
    'Russia',
    'Wales',
    'Slovakia',
    'Germany',
    'Poland',
    'Ukraine',
    'Northern Ireland',
    'Italy',
    'Czechia',
    'Croatia',
    'Spain',
    'Turkey',
    'Belgium',
    'Ireland',
    'Portugal',
    'Austria',
    'Iceland',
    'Hungary'
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
        .reduce((teamStrength, sum) => sum + teamStrength, 0) / teams.length);
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

    const dice1 = Math.ceil((likelyGoals1 * 6)/correction);
    const dice2 = Math.ceil((likelyGoals2 * 6)/correction);

    const iterations = 1000;
    const summedResults = Array.apply(null, Array(iterations))
        .map(() => {
            let result1 = 0;
            let result2 = 0;

            for(let i = 0; i < dice1; i++) {
                if (Math.ceil(Math.random()*6) === 6) result1++;
            }
            for(let i = 0; i < dice2; i++) {
                if (Math.ceil(Math.random()*6) === 6) result2++;
            }

            return {result1, result2};
        })
        .reduce((actResult, sum) => {
            sum.result1 += actResult.result1;
            sum.result2 += actResult.result2;
            return sum;
        }, {result1: 0, result2: 0});

    const result1 = Math.round(summedResults.result1/iterations);
    const result2 = Math.round(summedResults.result2/iterations);

    console.log(result1 + ' - ' + result2);
});