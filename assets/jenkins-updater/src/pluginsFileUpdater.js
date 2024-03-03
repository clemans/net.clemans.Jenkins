import axios from "axios";
import {parseHTML} from 'linkedom';
import {readdirSync, writeFileSync} from "fs";

/**
 * @file Update helper functions for jenkins-configuration-as-code: `plugins.txt`.
 *          Retrieves the <a href="https://plugins.jenkins.io/">latest version</a> of each plugin and the updates the file.
 * @author Brooks C. Clemans <brooks@clemans.net>
 * @see <a href="https://github.com/jenkinsci/docker/#install-plugins-script-1">Jenkins Docker Plugins</a>
 */

/**
 * Fetches the latest Jenkins plug-in versions and writes to file.
 * @param {string} plugins - Jenkins configuration-as-code plugins file: `plugins.txt` in utf-8 string format.
 * @returns {Promise<void>} - Writes the latest `plugin:version` to location: `/tmp/plugins.txt`
 */
export async function writeLatestPlugins(plugins) {
    try {
        let results = ""
        const outFile = "/tmp/plugins.txt"
        const latest = await _getLatestPlugins(plugins)
        latest.forEach((plugin, index) => {
            latest.length -1 !== index ?
                results += `${plugin.name}:${plugin.version}\n` :
                results += `${plugin.name}:${plugin.version}`
        })
        writeFileSync(outFile, results)
        console.log(readdirSync("/tmp/"))
    } catch (err) {
        console.error(err)
    }
}

/**
 * Returns a Jenkins plugins and version map object.
 * @param {String} plugins - Jenkins configuration-as-code plugins file: `plugins.txt` in utf-8 string format.
 * @returns {Promise<*[]>} - Map object.
 * @private
 */
async function _stringToMap(plugins) {
    try {
        let results = []
        plugins.split("\n").map(plugin => {
            const [name, version] = plugin.split(":")
            results.push({name, version})
        })
        return results
    } catch (err) {
        console.log(err)
    }
}

/**
 * Returns the latest version for the provided Jenkins plug-in
 * @param {Object} plugin - Jenkins plug-in object
 * @param {string} plugin.name - Jenkins plug-in name
 * @param {string} [plugin.version] - Jenkins plug-in version (unused property)
 * @returns {Promise<{name, version: (string|string)}>} - Map Object.
 * @private
 */
async function _fetchLatestVersion(plugin) {
    function JSDOM(html) {
        return parseHTML(html)
    }
    const html = await axios(`https://plugins.jenkins.io/${plugin.name}`)
    const {document} = JSDOM(html.data)
    const divs = (document.querySelectorAll("h5"))
    let version = ""
    divs.forEach(h5Element => {
        h5Element.textContent.includes("Version: ") ?
            version = (h5Element.textContent.split(": "))[1] :
            null
    })
    return {name: plugin.name, version: version}
}

/**
 * Returns the latest versions of Jenkins plugins
 * @param {String} plugins - Jenkins configuration-as-code plugins file: `plugins.txt` in utf-8 string format.
 * @returns {Promise<*>} - Map object.
 * @private
 */
async function _getLatestPlugins(plugins) {
    const currentPlugins = await _stringToMap(plugins)
    const results = []
    for(const plugin of currentPlugins) {
        results.push(await _fetchLatestVersion(plugin))
    }
    return results
}
