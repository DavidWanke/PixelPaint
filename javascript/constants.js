const fs = require('fs');
const path = require('path');

function loadNamespace() {
    /**
     * Load the namespace from the placeholders.json file
     *
     * @returns {string} The namespace
     */
    try {
        const placeholdersPath = path.join(__dirname, '..', 'definitions', 'placeholders.json');
        const placeholders = JSON.parse(fs.readFileSync(placeholdersPath, 'utf8'));
        return placeholders.NAMESPACE;
    } catch (error) {
        console.error('❌ Error loading namespace from placeholders.json:', error);
        console.error('   Falling back to default namespace');
        return 'crtrlabs_print';
    }
}

// Load the namespace once when the module is imported
const NAMESPACE = loadNamespace();

module.exports = {
    NAMESPACE
};