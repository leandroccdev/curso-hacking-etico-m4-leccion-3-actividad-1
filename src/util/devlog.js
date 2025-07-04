const IS_DEV = process.env.NODE_ENV === 'development';

module.exports = {
    devlog: (msg) => { if (IS_DEV) { console.log(msg); } },
    deverr: (err) => { if (IS_DEV) { console.error(err) } }
};