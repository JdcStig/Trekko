import fs from 'fs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import createPlayersFromCSV from './createPlayersFromCSV.js';
import calculateAverageDistance from './calculateAverageDistance.js'; // Ensure this is correctly imported

/**
 * Parse the uploaded CSV file, process data, and trigger calculations.
 * @param {Buffer} fileBuffer - The buffer of the uploaded CSV file.
 * @param {String} sessionId - The ID of the session.
 * @param {String} userId - The ID of the user uploading the data.
 */
const parseCSV = async (fileBuffer, sessionId, userId) => {
    return new Promise(async (resolve, reject) => {
      console.time('CSV Parsing Time');
      try {
        console.log("📌 `parseCSV` function called! ✅");
  
        if (!fileBuffer || fileBuffer.length === 0) {
          console.error("🚨 File buffer is empty!");
          return reject(new Error("Uploaded file is empty."));
        }
        console.log(`✅ File buffer received, size: ${fileBuffer.length} bytes`);
  
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
          console.error("🚨 Invalid sessionId:", sessionId);
          return reject(new Error("Invalid session ID."));
        }
  
        const fileString = fileBuffer.toString('utf-8');
        let delimiter = ',';
        if (fileString.includes('\t')) delimiter = '\t';
        else if (fileString.includes(';')) delimiter = ';';
        else if (fileString.includes('  ')) delimiter = ' ';
  
        console.log(`✅ Using detected delimiter: "${delimiter}"`);
  
        const stream = Readable.from(fileString);
        const results = [];
  
        stream
          .pipe(csvParser({ separator: delimiter, trim: true }))
          .on('data', (row) => {
            results.push(row);
          })
          .on('end', async () => {
            console.log(`✅ CSV parsed successfully. Rows: ${results.length}`);
  
            if (results.length === 0) {
              return reject(new Error("CSV file is empty or not parsed correctly."));
            }
  
            const session = await Session.findById(sessionId);
            if (!session) {
              console.error("🚨 Session not found for ID:", sessionId);
              return reject(new Error(`Session not found: ${sessionId}`));
            }
  
            console.log("✅ Session found. Processing data...");
  
            const existingPlayerData = await SessionPlayerData.find({ sessionId });
            if (existingPlayerData.length > 0) {
              console.log("⚠️ Session already contains player data. Skipping CSV processing.");
              return reject(new Error("Session already processed."));
            }
  
            const playerId = results[0]['Player Display Name'] || "Unknown Player";
            const startTime = results[0]['Time'] || "00:00:0";
            const endTime = results[results.length - 1]['Time'] || "00:00:0";
  
            const lats = results.map(row => parseFloat(row['Lat']) || 0);
            const lons = results.map(row => parseFloat(row['Lon']) || 0);
            const speeds = results.map(row => parseFloat(row['Speed (m/s)']) || 0);
            const heartRates = results.map(row => parseInt(row['Heart Rate (bpm)']) || 0);
            const accelerationImpulses = results.map(row => parseFloat(row['Instantaneous Acceleration Impulse']) || 0);
            console.log("✅ Extracted data:", { playerId, startTime, endTime });
  
            if (lats.includes(NaN) || lons.includes(NaN) || speeds.includes(NaN)) {
              return reject(new Error("❌ Invalid numeric data found."));
            }
  
            const sessionPlayerData = new SessionPlayerData({
              sessionId,
              userId,
              playerId,
              startTime,
              endTime,
              lats,
              lons,
              speeds,
              heartRates,
              accelerationImpulses
            });
  
            console.time('Database Save Time');
            await sessionPlayerData.save();
            console.timeEnd('Database Save Time');
            console.log("✅ SessionPlayerData saved:", sessionPlayerData._id);
  
            // Trigger player creation after session data is saved
            const playersCreated = await createPlayersFromCSV(sessionId, userId);
  
            // Calculate the average distance after all CSV processing and player data insertion
            console.log("📌 Triggering average distance calculation after CSV processing...");
            const avgDistance = await calculateAverageDistance(sessionId);  // Call only once after all processing is complete
            console.log(`✅ Average distance calculated: ${avgDistance.toFixed(5)} km`);
  
            console.timeEnd('CSV Parsing Time');
            resolve();
          })
          .on('error', (error) => {
            console.error("🚨 CSV read error:", error.message);
            reject(new Error(`CSV read error: ${error.message}`));
          });
      } catch (error) {
        console.error("🚨 Unexpected CSV processing error:", error.message);
        reject(new Error(`CSV processing error: ${error.message}`));
      }
    });
  };  

export default parseCSV;
