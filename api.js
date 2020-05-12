const mysql = require('mysql');

const {HOME} = require('./constants');

let connection = mysql.createConnection({
    host: 'sql9.freesqldatabase.com',
    user: 'sql9337863',
    password: 'CdsXjA4N2I',
    database: 'sql9337863'
});

connection.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + connection.threadId);
});

const DATABASE = 'sql9337863';
const TABLES = {
    TRACKS: 'tracks',
    ARTISTS: 'artists',
    ALBUMS: 'albums',
    LISTS: 'lists',
    TRACK_LIST: 'track_list_relationship'
};

module.exports = {

    // func: function({title, address, artist_id, album_id}) {
    //     const sql = `SELECT name FROM ${DATABASE}.${TABLES.ARTISTS} WHERE id = ${artist_id}` +
    //         ` UNION ` +
    //         `SELECT name FROM ${DATABASE}.${TABLES.ALBUMS} WHERE id = ${album_id}`;
    //     return new Promise((resolve, reject) => {
    //         connection.query(sql, function (error, results_) {
    //             if (error) reject(error);
    //
    //             const artist = results_[0].name;
    //             const album = results_[1].name;
    //
    //             // console.log('ex', results_);
    //             resolve({title, address, artist, album});
    //         });
    //     });
    // },
    //
    // requestTracks: function() {
    //     let context = this;
    //     return new Promise((resolve, reject) => {
    //         let sql = `SELECT * FROM ${DATABASE}.${TABLES.TRACKS}`;
    //         connection.query(sql, async function (error, results) {
    //
    //             if (error) reject(error);
    //
    //             const promises = results.map(async function (result) {
    //
    //                 return await context.func(result);
    //
    //                 // sql = `SELECT name FROM ${DATABASE}.${TABLES.ARTISTS} WHERE id = ${artist_id}` +
    //                 //     ` UNION ` +
    //                 //     `SELECT name FROM ${DATABASE}.${TABLES.ALBUMS} WHERE id = ${album_id}`;
    //                 //
    //                 // try {
    //                 //     const results_ = await connection.query(sql);
    //                 //
    //                 //     console.log(results_);
    //                 //
    //                 //     const artist = results_[0].name;
    //                 //     const album = results_[1].name;
    //                 //
    //                 //     return {title, address, artist, album};
    //                 // } catch (e) {
    //                 //     return e;
    //                 // }
    //             });
    //
    //             const tracks = await Promise.all(promises);
    //             resolve(tracks);
    //         });
    //     });
    // },

    makeRequest: function(sql) {
        return new Promise((resolve, reject) => {
            connection.query(sql, function (error, results) {
                if (error) reject(error);

                resolve(results);
            });
        });
    },

    getListId: async function(pathname) {
        const sql = `SELECT id FROM ${DATABASE}.${TABLES.LISTS} WHERE pagename = '${pathname}'`;

        const list = await this.makeRequest(sql);
        console.log(list);
        return list[0].id;
    },

    getTrackData: async function({...data}) {
        const sql = `SELECT name FROM ${DATABASE}.${TABLES.ARTISTS} WHERE id = ${data.artist_id}` +
            ` UNION ` +
            `SELECT name FROM ${DATABASE}.${TABLES.ALBUMS} WHERE id = ${data.album_id}`;

        const result = await this.makeRequest(sql);
        // console.log(result);
        return {
            id: data.id,
            title: data.title,
            address: data.address,
            artist: result[0].name,
            album: result[1].name
        };
    },

    getTrackById: async function(id) {
        // console.log('id', id);
        const sql = `SELECT * FROM ${DATABASE}.${TABLES.TRACKS} WHERE id = ${id}`;

        const track = await this.makeRequest(sql);
        console.log('track', track[0]);

        return await this.getTrackData({...track[0]});
    },

    getTracksByListId: async function(id) {
        const sql = `SELECT track_id FROM ${DATABASE}.${TABLES.TRACK_LIST} WHERE list_id = ${id}`;

        const track_ids = await this.makeRequest(sql);
        // console.log('track_ids', track_ids);

        const context = this;
        const promises = track_ids.map(async function ({track_id}) {
            // console.log('track_id', track_id);
            return await context.getTrackById(track_id);
        });

        const tracks = await Promise.all(promises);
        return tracks;
    },

    getTracks: async function ({pathname}, callback) {
        switch (pathname) {
            case HOME:
                console.log('HOME');

                const id = await this.getListId(HOME);
                // console.log(id);

                const tracks = await this.getTracksByListId(id);
                // console.log('tracks', tracks);

                callback(tracks);

                // // this.func().then((resp) => {
                // //     console.log('resp', resp);
                // // }
                //
                // const results = await this.requestTracks();
                // console.log('resp', results);
                // callback(results);
                break;
            default:
                return;
        }
    }
};