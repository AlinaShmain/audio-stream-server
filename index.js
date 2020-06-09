const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const ss = require('socket.io-stream');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const {PerformanceObserver, performance} = require('perf_hooks');

const api = require('./api');
// const {HOME} = require('./constants');

const PORT = 5000;

const app = express();
const server = http.createServer(app);
// const io = socketio(server);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// parse application/json
app.use(bodyParser.json());

// app.use(cors());

const io = socketio.listen(server, {
    log: false,
    agent: false,
    origins: '*:*',
    transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling']
});

const MPEG_version = {
    '00': 'MPEG-2.5',
    '01': 'reserved',
    '10': 'MPEG-2',
    '11': 'MPEG-1'
};

const Layer_index = {
    '00': 'reserved',
    '01': 'Layer III',
    '10': 'Layer II',
    '11': 'Layer I'
};

const Frequency_index = {
    [MPEG_version['11']]: {
        '00': 44100,
        '01': 48000,
        '10': 32000
    },
    [MPEG_version['10']]: {
        '00': 22050,
        '01': 24000,
        '10': 16000
    },
    [MPEG_version['00']]: {
        '00': 11025,
        '01': 12000,
        '10': 8000
    }
};

const Channel_Mode_Index = {
    '00': 'Stereo',
    '01': 'Join stereo',
    '10': 'Dual channel',
    '11': 'Mono'
};

const XING_offset = {
    [MPEG_version['11']]: {
        [Channel_Mode_Index['00']]: 32,
        [Channel_Mode_Index['01']]: 32,
        [Channel_Mode_Index['10']]: 32,
        [Channel_Mode_Index['11']]: 17
    },
    [MPEG_version['10']]: {
        [Channel_Mode_Index['00']]: 17,
        [Channel_Mode_Index['01']]: 17,
        [Channel_Mode_Index['10']]: 17,
        [Channel_Mode_Index['11']]: 9
    },
    [MPEG_version['00']]: {
        [Channel_Mode_Index['00']]: 17,
        [Channel_Mode_Index['01']]: 17,
        [Channel_Mode_Index['10']]: 17,
        [Channel_Mode_Index['11']]: 9
    }
};

// const samples_per_frame = new Map([
//     [[[MPEG_version['11'], Layer_index['11']]], 384],
//     [[[MPEG_version['10'], Layer_index['11']]], 384],
//     [[[MPEG_version['00'], Layer_index['11']]], 384],
//     [[[MPEG_version['11'], Layer_index['10']]], 1152],
//     [[[MPEG_version['10'], Layer_index['10']]], 1152],
//     [[[MPEG_version['00'], Layer_index['10']]], 1152],
//     [[[MPEG_version['11'], Layer_index['01']]], 1152],
//     [[[MPEG_version['10'], Layer_index['01']]], 576],
//     [[[MPEG_version['00'], Layer_index['01']]], 576]
// ]);

const samples_per_frame = {
    [MPEG_version['11']]: {
        [Layer_index['11']]: 384,
        [Layer_index['10']]: 1152,
        [Layer_index['01']]: 1152
    },
    [MPEG_version['10']]: {
        [Layer_index['11']]: 384,
        [Layer_index['10']]: 1152,
        [Layer_index['01']]: 576
    },
    [MPEG_version['00']]: {
        [Layer_index['11']]: 384,
        [Layer_index['10']]: 1152,
        [Layer_index['01']]: 576
    }
};

// const compareArrays = (array1, array2) => {
//     return array1.length === array2.length && array1.sort().every((value, index) => {
//         return value === array2.sort()[index]
//     });
// };
//
// console.log(compareArrays([1, 2], [1, 2]));

// function hex2a(hexx) {
//     let hex = hexx.toString();
//     let str = '';
//     for (let i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
//         str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
//     return str;
// }
//
function convert(hex) {
    return (parseInt(hex, 16).toString(2)).padStart(8, '0');
}

function hex2bin(hex) {
    let hexStr = hex.split('');
    let result = "";
    let offset = 0;
    while (offset < hexStr.length) {
        result += convert(hexStr[offset] + '' + hexStr[offset + 1]);
        offset += 2;
    }
    // console.log(result);
    return result;
}

io.on('connection', client => {

    console.log('Client connected');

    let filePath = null;
    let stat = null;
    let fileSize = null;
    let chunkSize = null;
    let fileDuration = null;

    let readStream;

    // const stream = ss.createStream();

    client.on('signUp', ({user}, callback) => {
        console.log(user);
        api.signUp(user, function (response) {
            console.log('response', response);
            callback(response);
        });
    });

    client.on('signIn', ({user}, callback) => {
        api.signIn(user, function (response) {
            callback(response);
        })
    });

    client.on('verifyToken', ({token}, callback) => {
        console.log('token', token);
        api.checkVerified(token, function (response) {
            console.log(response);
            callback(response);
        });
    });

    client.on('addTrack', ({trackInfo}, callback) => {
        api.addTrack(trackInfo, function (response) {

        });
    });

    client.on('getTracks', ({pathname}, callback) => {
        console.log(pathname);

        api.getTracks({pathname}, function (response) {
            console.log('resp', response);

            callback(response);
        });
    });

    client.on('searchTracks', ({value}, callback) => {
        console.log('regexp', value);

        api.getMatchTracks(value, function (response) {
            callback(response);
        });
    });

    client.on('track', ({id}) => {
        const NUM_OF_CHUNKS = 10;

        console.log('id', id);
        api.getPathTrack(id, function (response) {
            console.log('filePath', response);

            filePath = path.resolve(__dirname, `./${response[1]}`, `./${response[2]}`);
            stat = fs.statSync(filePath);
            fileSize = stat.size;
            chunkSize = Math.floor(fileSize / NUM_OF_CHUNKS);

            console.log('track event fileSize:', fileSize);
            // const readMetaStream = fs.createReadStream(filePath, {highWaterMark: fileSize, start: 0, end: fileSize});

            let mpeg_version;
            let channel_mode;
            let xing_offset;
            let layout_version;
            let samples_number;
            let sample_frequency;
            let bitrate;
            let time_per_frame;

            let First_Frame_header_position;
            let XING_header_position;
            let VBRI_header_position;

            // readMetaStream.on('data', (chunk) => {
            fs.readFile(filePath, function (err, chunk) {
                First_Frame_header_position = chunk.indexOf(new Uint8Array([255, 251]));
                if (First_Frame_header_position === -1) First_Frame_header_position = chunk.indexOf(new Uint8Array([255, 250]));

                console.log('First_Frame_header_position', First_Frame_header_position);
                console.log('chunk size', chunk.length);

                if (First_Frame_header_position !== -1) {
                    const headerBin = hex2bin(chunk.slice(First_Frame_header_position, First_Frame_header_position + 4).toString('hex'));
                    mpeg_version = MPEG_version[headerBin.substr(11, 2)];
                    console.log('mpeg_version', mpeg_version);

                    layout_version = Layer_index[headerBin.substr(13, 2)];
                    console.log("layout_version", layout_version);

                    samples_number = samples_per_frame[mpeg_version][layout_version];
                    console.log("samples_number", samples_number);

                    sample_frequency = Frequency_index[mpeg_version][headerBin.substr(20, 2)];
                    console.log("sample_frequency", sample_frequency);

                    time_per_frame = samples_number / sample_frequency;
                    console.log("time_per_frame", time_per_frame);

                    channel_mode = Channel_Mode_Index[headerBin.substr(24, 2)];
                    console.log('channel_mode', channel_mode);

                    xing_offset = XING_offset[mpeg_version][channel_mode];
                    console.log('xing_offset', xing_offset);

                    XING_header_position = First_Frame_header_position + 4 + xing_offset;
                    console.log('Xing', XING_header_position);

                    VBRI_header_position = First_Frame_header_position + 4 + 32;
                    console.log('VBRI', VBRI_header_position);

                    const info = chunk.slice(XING_header_position, XING_header_position + 4).toString();
                    const vbri = chunk.slice(VBRI_header_position, VBRI_header_position + 4).toString();

                    let numberOfFrames_position;
                    let numberOfFrames;
                    if (info === 'Xing' || info === 'Info') {
                        console.log('This is a VBR MP3 with Xing header');

                        numberOfFrames_position = XING_header_position + 8;
                        numberOfFrames = chunk.slice(numberOfFrames_position, numberOfFrames_position + 4).readUInt32BE();
                        console.log('numberOfFrames', numberOfFrames);

                        fileDuration = time_per_frame * numberOfFrames;
                        console.log('fileDuration', fileDuration);
                    } else if (vbri === 'VBRI') {
                        console.log('This is a VBR MP3 with VBRI header');
                    } else {
                        console.log('This is a CBR MP3');

                        bitrate = headerBin.substr(16, 4);
                        console.log('bitrate', bitrate);

                        // const frame_size = 4*8 + time_per_frame * 128 * 1000;
                        console.log(fileSize);
                        fileDuration = fileSize * 8 / (128 * 1000);

                        // Frame_Size = 144 * Bitrate / Sample_Frequency + Padding Size;
                        // const total_frame_number = fileSize / frame_size;
                        // fileDuration = time_per_frame * total_frame_number;
                        console.log('fileDuration', fileDuration);
                    }

                    client.emit('metadata', {
                        fileSize, chunkSize, fileDuration
                    });
                } else {
                    console.log('no header');
                }
            });

            // readMetaStream.on('end', () => {
            //     client.emit('metadata', {
            //         fileSize, chunkSize, fileDuration
            //     });
            // });
        });
    });
    let isStopped = false;

    client.on('play', ({startSize}) => {
        // let numberOfFrames = 0;
        // let numberOfChunks = 0;
        console.log('play');

        console.log('chunkSize', chunkSize);
        console.log('startSize', startSize);

        readStream = fs.createReadStream(filePath, {
            highWaterMark: chunkSize
            // start: startSize,
            // end: fileSize
        });

        let offset_ = 0;
        let chunkBuffer = null;
        let totalBuffer = null;

        readStream.on('data', (chunk) => {
            console.log('chunk', chunk.length);

            // if(!isStopped) {
            console.log('playing !!!!!!!');

            const previousOffset = Object.assign({}, offset_);

            offset_ = chunk.lastIndexOf(new Uint8Array([255, 251]));

            // console.log('offset_', offset_);

            if (offset_ !== -1) {
                chunkBuffer = chunkBuffer ? Buffer.concat([chunkBuffer, chunk.slice(0, offset_)]) : chunk.slice(0, offset_);
                // console.log('chunkBuffer2', chunkBuffer.length);

                totalBuffer = totalBuffer ? Buffer.concat([totalBuffer, chunkBuffer]) : chunkBuffer;
                console.log('totalBuffer', totalBuffer.length);
                if (startSize > 0) {
                    if ((totalBuffer.length - chunkBuffer.length) <= startSize && startSize <= totalBuffer.length) {
                        console.log(totalBuffer.length - chunkBuffer.length);
                        console.log('chunkBuffer', chunkBuffer.length);
                        const offset = totalBuffer.slice(0, startSize).lastIndexOf(new Uint8Array([255, 251]));

                        if (offset !== -1) {
                            const header = chunkBuffer.slice(offset, offset + 4);

                            console.log('header', header);
                            console.log('startSize', startSize);
                            console.log('chunk', chunk.length);
                            console.log(totalBuffer.length - startSize);
                            // const startChunk = chunk.slice((totalBuffer.length - startSize), chunk.length);
                            const startChunk = totalBuffer.slice(startSize);
                            console.log('startChunk', startChunk.length);
                            totalBuffer = totalBuffer.slice(0, startSize);
                            chunkBuffer = Buffer.concat([header, startChunk]);
                            console.log('start', chunkBuffer.length);
                        }
                        // else {
                        // const header = totalBuffer.slice(previousOffset, previousOffset + 4);
                        // const startChunk = totalBuffer.slice(startSize);
                        // totalBuffer = totalBuffer.slice(0, startSize);
                        // chunkBuffer = Buffer.concat([header, startChunk]);
                        // chunkBuffer = Buffer.concat([chunkBuffer, chunk.slice(offset_)])
                        // }
                        //         // client.emit('audio', chunkBuffer);
                        startSize = 0;
                        chunkBuffer = Buffer.concat([chunkBuffer, chunk.slice(offset_)]);
                    } else
                        chunkBuffer = chunk.slice(offset_);
                } else {
                    console.log('sending chunk');
                    client.emit('audio', chunkBuffer);
                    console.log(chunkBuffer.length);
                    //
                    chunkBuffer = chunk.slice(offset_);
                    // offset_ = 0;
                    //
                    //     // console.log('chunkBuffer1', chunkBuffer.length);
                }

                // }
            } else {
                console.log('offset not found!!!!!!');
                chunkBuffer = chunkBuffer ? Buffer.concat([chunkBuffer, chunk]) : chunk;
            }
            // }
            // else {
            //     isStopped = false;
            //     console.log('isStopped', isStopped);
            // }
        });

        readStream.once('end', () => {
            client.emit('end');
        });

        // const readStream_ = fs.createReadStream(filePath, {start:0, end:1024});
        //
        // readStream_.pipe(stream);
        //
        // ss(client).emit('track-stream', stream);
    });

    client.on('stopLoad', (callback) => {
        // if(readStream) {
        //     readStream.pause();
        // }
        console.log('stpped');

        try {
            readStream && readStream.destroy();

            callback('stopped');
            // isStopped = true;
        } catch (e) {
            callback(e);
        }
    });

    client.on('disconnect', () => {
    });
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));