import fs from 'fs';
import csvParser from 'csv-parser';

/**
 * Parses a CSV file and extracts session data.
 * @param {String} filePath - Path to the CSV file.
 * @returns {Promise<Object>} - Extracted session data.
 */
const parseCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                results.push(row);
            })
            .on('end', () => {
                if (results.length === 0) {
                    return reject(new Error("CSV file is empty or invalid"));
                }

                // // Extracts the player name (all rows have the same player name)
                // const playerId = results[0]['Player Display Name'] || "Unknown Player";
                
                // Extracts the startTime (first row) and endTime (last row)
                const startTime = results[0]['Time'] || "00:00.0";
                const endTime = results[results.length - 1]['Time'] || "00:00.0";

                // Extracts the arrays of lats, lons, and speeds
                const lats = results.map(row => parseFloat(row['Latitude']) || 0);
                const lons = results.map(row => parseFloat(row['Longitude']) || 0);
                const speeds = results.map(row => parseFloat(row['Speed']) || 0);

                resolve({ startTime, endTime, lats, lons, speeds });
            })
            .on('error', (error) => reject(error));
    });
};

export default parseCSV;
