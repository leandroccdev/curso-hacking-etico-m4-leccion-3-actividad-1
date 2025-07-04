/**
 * Genera un timestamp compatible con el campo exp de jwt para compararciones.
 * 
 * @returns Integer
 */
function get_now() {
    return Math.floor(Date.now() / 1000);
}

module.exports = {
    get_now: get_now
};