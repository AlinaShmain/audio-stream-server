const {Client} = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt-nodejs');

const secret = "mysecret";
const SALT_WORK_FACTOR = 10;

const {HOME} = require('./constants');

const client = new Client({
    connectionString: "postgres://fdektyeannwqfg:feb6b0f415ee46c2558a4ab47a8ba37bbd3db6bfe63a6c026a43ef4efc3be46a@ec2-52-73-247-67.compute-1.amazonaws.com:5432/d1e31c74r3af49",
    ssl: {rejectUnauthorized: false}
});

client.connect(function (err) {
    if (err)
        console.log(err);
    else
        console.log("DB connected!");
});

const TABLES = {
    TRACKS: 'tracks',
    ARTISTS: 'artists',
    ALBUMS: 'albums',
    LISTS: 'lists',
    TRACK_LIST: 'track_list_relationship',
    USERS: 'users'
};

// let sql = `SELECT * FROM ${TABLES.TRACKS}`;
// client.query(sql, (err, res) => {
//     if (err) throw err;
//     for (let row of res.rows) {
//         console.log(JSON.stringify(row));
//     }
//     client.end();
// });

module.exports = {
//
//     // func: function({title, address, artist_id, album_id}) {
//     //     const sql = `SELECT name FROM ${DATABASE}.${TABLES.ARTISTS} WHERE id = ${artist_id}` +
//     //         ` UNION ` +
//     //         `SELECT name FROM ${DATABASE}.${TABLES.ALBUMS} WHERE id = ${album_id}`;
//     //     return new Promise((resolve, reject) => {
//     //         connection.query(sql, function (error, results_) {
//     //             if (error) reject(error);
//     //
//     //             const artist = results_[0].name;
//     //             const album = results_[1].name;
//     //
//     //             // console.log('ex', results_);
//     //             resolve({title, address, artist, album});
//     //         });
//     //     });
//     // },
//     //
//     // requestTracks: function() {
//     //     let context = this;
//     //     return new Promise((resolve, reject) => {
//     //         let sql = `SELECT * FROM ${DATABASE}.${TABLES.TRACKS}`;
//     //         connection.query(sql, async function (error, results) {
//     //
//     //             if (error) reject(error);
//     //
//     //             const promises = results.map(async function (result) {
//     //
//     //                 return await context.func(result);
//     //
//     //                 // sql = `SELECT name FROM ${DATABASE}.${TABLES.ARTISTS} WHERE id = ${artist_id}` +
//     //                 //     ` UNION ` +
//     //                 //     `SELECT name FROM ${DATABASE}.${TABLES.ALBUMS} WHERE id = ${album_id}`;
//     //                 //
//     //                 // try {
//     //                 //     const results_ = await connection.query(sql);
//     //                 //
//     //                 //     console.log(results_);
//     //                 //
//     //                 //     const artist = results_[0].name;
//     //                 //     const album = results_[1].name;
//     //                 //
//     //                 //     return {title, address, artist, album};
//     //                 // } catch (e) {
//     //                 //     return e;
//     //                 // }
//     //             });
//     //
//     //             const tracks = await Promise.all(promises);
//     //             resolve(tracks);
//     //         });
//     //     });
//     // },
//
    makeRequest: function (sql) {
        return new Promise((resolve, reject) => {
            client.query(sql, function (error, results) {
                if (error) reject(error);

                resolve(results.rows);
            });
        });
    },

    getListId: async function (pathname) {
        const sql = `SELECT id FROM ${TABLES.LISTS} WHERE pagename = '${pathname}'`;
        try {
            const list = await this.makeRequest(sql);
            return list[0].id;
        } catch {
            return false;
        }
    },

    getTrackData: async function ({...data}) {
        const sql1 = `SELECT name FROM ${TABLES.ARTISTS} WHERE id = ${data.artist_id}`;
        // ` UNION ` +
        const sql2 = `SELECT name FROM ${TABLES.ALBUMS} WHERE id = ${data.album_id}`;

        const artist = await this.makeRequest(sql1);
        const album = await this.makeRequest(sql2);
        console.log('artist name', artist[0].name);
        return {
            id: data.id,
            title: data.title,
            address: data.address,
            artist: artist[0].name,
            album: album[0].name
        };
    },

    getTrackById: async function (id) {
        // console.log('id', id);
        const sql = `SELECT * FROM ${TABLES.TRACKS} WHERE id = ${id}`;

        const track = await this.makeRequest(sql);
        console.log('track', track[0]);

        return await this.getTrackData({...track[0]});
    },

    getTracksByListId: async function (id) {
        const sql = `SELECT track_id FROM ${TABLES.TRACK_LIST} WHERE list_id = ${id}`;

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
                console.log(id);

                if (id) {
                    const tracks = await this.getTracksByListId(id);
                    console.log('tracks', tracks);

                    callback(tracks);
                }
                break;
            default:
                return;
        }
    },

    getPathTrack: async function (id, callback) {
        const track = await this.getTrackById(id);

        const filePath = track.address.split('/');

        callback(filePath);
    },

    saveUsertoDB: function ({username, email, password}) {
        return new Promise((resolve, reject) => {
            const document = this;
            bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
                if (err) reject(err);

                bcrypt.hash(password, salt, null, async function (err, hash) {
                    if (err) reject(err);
                    const sql = `INSERT INTO ${TABLES.USERS} (name, password, email) VALUES ('${username}', '${hash}', '${email}')`;
                    const response = await document.makeRequest(sql);
                    console.log(response);
                    resolve(response);
                });
            });
        });
    },

    signUp: async function ({username, email, password}, callback) {
        const sql = `SELECT id FROM ${TABLES.USERS} WHERE email = '${email}'`;

        const emailExist = await this.makeRequest(sql);
        console.log(emailExist);
        if (emailExist.length) {
            console.log('jkk');
            callback({status: 'warning', message: 'Email already exists'});
        } else {
            try {
                console.log(',dd');
                await this.saveUsertoDB({username, email, password});

                const savedUser = await this.makeRequest(sql);
                console.log('savedUser', savedUser);

                const token = jwt.sign(savedUser[0].id, secret);
                callback({status: 'success', token: token});
            } catch (e) {
                console.log(e);
                callback({status: 'error', message: 'Internal error please try again'});
            }
        }
    },

    signIn: async function ({username, email, password}, callback) {
        const sql = `SELECT id FROM ${TABLES.USERS} WHERE email = '${email}'`;

        const emailExist = await this.makeRequest(sql);
        console.log(emailExist);
        if (emailExist.length) {
            console.log('jkk');
            console.log('info', email, username);

            const sql = `SELECT id, password FROM ${TABLES.USERS} WHERE email = '${email}' AND name = '${username}'`;

            const obj = await this.makeRequest(sql);
            console.log('pass', obj);

            this.isCorrectPassword(password, obj[0].password, function (err, same) {
                if (err) {
                    console.log('Internal error please try again');
                    callback({status: 'error', message: 'Internal error please try again'});
                } else if (!same) {
                    console.log('Incorrect password');
                    callback({status: 'error', message: 'Incorrect name or password'});
                } else {
                    console.log('same', same);
                    console.log('valid');

                    const token = jwt.sign(obj[0].id, secret);
                    console.log(token);

                    callback({status: 'success', token: token});
                }
            });

            // this.isCorrectPassword(password, async (decrypted) => {
            //     const sql = `SELECT id FROM ${TABLES.USERS} WHERE email = '${email}' && name = '${username}' && password = '${decrypted}'`;
            //     const infoCorrect = await this.makeRequest(sql);
            //     console.log('infoCorrect', infoCorrect);
            //
            //     if(infoCorrect.length) {
            //         const token = jwt.sign(infoCorrect[0].id, secret);
            //         callback({status: 'success', token});
            //     } else callback({status: 'warning', message: 'Incorrect name or password'});
            // });
        } else {
            callback({status: 'warning', message: 'Incorrect name or password'})
        }
    },

    isCorrectPassword: function (password, actualPassword, callback) {
        console.log(password);
        bcrypt.compare(password, actualPassword, function (err, same) {
            if (err) {
                callback(err);
            } else {
                console.log('same', same);
                callback(err, same);
            }
        });
    },

    checkVerified: function (token, callback) {
        try {
            const verified = jwt.verify(token, secret);
            console.log('verified', verified);
            callback({status: 'success', verified});
        } catch (e) {
            callback({status: 'error', message: 'Invalid Token'});
        }
    },

    addTrack: async function (trackInfo, callback) {
        console.log('trackInfo', trackInfo);

        const {nameArtist, descriptionArtist, genreArtist} = trackInfo.artistInfo;

        const sql = `INSERT INTO artists (name, description, genre) VALUES ('${nameArtist}', '${descriptionArtist}', '${genreArtist}')`;

        const response = await this.makeRequest(sql);
        console.log(response);
    },

    getMatchTracks: async function (value, callback) {
        const sql = `SELECT id FROM ${TABLES.TRACKS} WHERE title LIKE '${value.toLowerCase()}%'`;
        console.log(sql);

        const track_ids = await this.makeRequest(sql);
        console.log('track_ids', track_ids);
        //
        // const context = this;
        // const promises = track_ids.map(async function ({track_id}) {
        //     // console.log('track_id', track_id);
        //     return await context.getTrackById(track_id);
        // });
        //
        // const tracks = await Promise.all(promises);
        // return tracks;
    }
};