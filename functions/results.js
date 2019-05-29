'use strict';

exports.generateResults = async q => {
  if (q == 'obama news') {
    return [
        {
            cse_image: 'https://static.politico.com/da/f5/44342c424c68b675719324b1106b/politico.jpg',
            cse_thumbnails: [{height: '168', src: 'https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcSN5DhnQg3ATKm5n6u2mKJqBYQACxdZ6JPqISooFRrMen5CT2uf8dOs0lE/', width: '300'}],
            snippet: 'Latest news, headlines, analysis, photos and videos on President Barack Obama .',
            title: 'President Barack Obama: Latest News, Top Stories & Analysis ...',
            type: 'news_article'
        },{
            cse_image: 'http://static.digg.com/images/e438d607165640bfaaa6950a0c04b8ea_db3dda5ee150433ea638d1807205cfc6_1_www_marquee_standard.jpeg',
            cse_thumbnails: [{height: '166', src: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRHzmrYFvh9RzGFjkwfM9krTOQAqpGUuvxdk2_ACRrZWq10_MRrBhw_QfM', width: '304'}],
            snippet: "Apr 17, 2019 ... The partisan tilt of Fox News is not exactly news, but this supercut from NowThis really puts into perspective the network's respective treatment ..." ,
            title: "A Darkly Hilarious Supercut Of Fox News Hosts Bashing Obama For ...",
            type: 'news_article'
        },{
            cse_image: 'https://a57.foxnews.com/media2.foxnews.com/BrightCove/694940094001/2019/05/01/931/524/694940094001_6031906131001_6031902053001-vs.jpg?ve=1&tl=1',
            cse_thumbnails: [{height: '168', src: 'https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcRZYepo9uDMpcQ_PiaL0_oTbQwiaT8S44qbCFRlYaxwkl4_Vz_i_VdkZoo', width: '299'}],
            snippet: "2 days ago ... Sasha Obama, the youngest daughter of former President Barack Obama attended her ... Fox News' Kathleen Joyce contributed to this report." ,
            title: "Former President Barack Obama's youngest daughter, Sasha ...",
            type: 'news_article'
        }
    ];
    }
};