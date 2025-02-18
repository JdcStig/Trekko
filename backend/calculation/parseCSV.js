import fs from 'fs';
import csvParser from 'csv-parser';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import createPlayersFromCSV from './createPlayersFromCSV.js';
import { Readable } from 'stream';
import mongoose from 'mongoose';

// Calculates the distance, topspeed, highspeedRunning and Sprinting
const metricsCalculations = {
    Distance: (values) => values.reduce((acc, val) => acc + val, 0) / 1000, // in km
    TopSpeed: (values) => Math.max(...values), // max speed (top speed)
    HighSpeedRunning: (values) => values.filter(v => v > 5.5).reduce((acc, val) => acc + val, 0) / 1000, // in km
    Sprinting: (values) => values.filter(v => v > 7).reduce((acc, val) => acc + val, 0) / 1000 // in km
  };


const parseCSV = async (fileBuffer, sessionId, userId) => {
    return new Promise(async (resolve, reject) => {
        //console.log("📌 `parseCSV` function called! ✅");

        try {
            if (!fileBuffer || fileBuffer.length === 0) {
               // console.error("🚨 File buffer is empty!");
                return reject(new Error("Uploaded file is empty."));
            }

            //console.log(`✅ File buffer received, size: ${fileBuffer.length} bytes`);

            // Validate sessionId is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(sessionId)) {
                //console.error("🚨 Invalid sessionId:", sessionId);
                return reject(new Error("Invalid session ID."));
            }

            // Detect delimiter
            const fileString = fileBuffer.toString('utf-8');
            let delimiter = ',';
            if (fileString.includes('\t')) delimiter = '\t';
            else if (fileString.includes(';')) delimiter = ';';
            else if (fileString.includes('  ')) delimiter = ' ';

           // console.log(`✅ Using detected delimiter: "${delimiter}"`);

            const stream = Readable.from(fileString);
            const results = [];

            stream
                .pipe(csvParser({ separator: delimiter, trim: true }))
                .on('data', (row) => results.push(row))
                .on('end', async () => {
                    //console.log(`✅ CSV parsed successfully. Rows: ${results.length}`);

                    if (results.length === 0) {
                        return reject(new Error("CSV file is empty or not parsed correctly."));
                    }

                    // Check if session exists
                    const session = await Session.findById(sessionId);
                    if (!session) {
                        return reject(new Error(`Session not found: ${sessionId}`));
                    }

                    //console.log("✅ Session found. Processing data...");

                    const playerId = results[0]['Player Display Name'] || "Unknown Player";
                    const startTime = results[0]['Time'] || "00:00:0";
                    const endTime = results[results.length - 1]['Time'] || "00:00:0";




                    // Extract numeric values
                    const lats = results.map(row => parseFloat(row['Lat']) || 0);
                    const lons = results.map(row => parseFloat(row['Lon']) || 0);
                    const speeds = results.map(row => parseFloat(row['Speed (m/s)']) || 0);
                    const heartRates = results.map(row => parseInt(row['Heart Rate (bpm)']) || 0);
                    const accelerationImpulses = results.map(row => parseFloat(row['Instantaneous Acceleration Impulse']) || 0);
                    //console.log("✅ Extracted data:", { playerId, startTime, endTime });

                    if (lats.includes(NaN) || lons.includes(NaN) || speeds.includes(NaN)) {
                        return reject(new Error("❌ Invalid numeric data found."));
                    }

                    // Save session data
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

                    await sessionPlayerData.save();
                    const playerName = sessionPlayerData.playerId;
                    const avgSpeed = sessionPlayerData.avgSpeed;
                    //console.log("✅ SessionPlayerData saved:", sessionPlayerData._id);
                     
                    await createPlayersFromCSV(sessionId, userId);


                    // Creates session-level metrics
                    const sessionPlayerMetrics = Object.keys(metricsCalculations).map(metric => ({
                        MetricName: metric,
                        Value: metricsCalculations[metric](speeds), // Calculate session metrics
                        Unit: metric === 'TopSpeed' ? 'm/s' : 'km'
                    })); // 🆕 Added sessionPlayerMetrics calculation

                    // Creates split-level metrics
                    const splitPlayerMetrics = session.splits.map((split, index) => {
                        const splitSpeeds = speeds.slice(split.start, split.end);
                        const splitMetrics = Object.keys(metricsCalculations).map(metric => ({
                            MetricName: metric,
                            Value: metricsCalculations[metric](splitSpeeds), // Calculate split metrics
                            Unit: metric === 'TopSpeed' ? 'm/s' : 'km'
                        }));
                        return { SplitNumber: index + 1, SplitMetrics: splitMetrics }; // 🆕 Added splitPlayerMetrics calculation
                    });

                    // Update session
                    const updatedSession = await Session.findByIdAndUpdate(
                        sessionId,
                        { $inc: { number: 1 }, $addToSet: { sessionPlayerData: {_id: sessionPlayerData._id, playerName, sessionPlayerMetrics, splitPlayerMetrics } }
                    },
                        { new: true }
                    );

                    //console.log(`✅ Session updated: ${updatedSession.number} CSV files processed.`);
                    resolve();
                })
                .on('error', (error) => {
                    //console.error("🚨 CSV read error:", error.message);
                    reject(new Error(`CSV read error: ${error.message}`));
                });

        } catch (error) {
           // console.error("🚨 Unexpected CSV processing error:", error.message);
            reject(new Error(`CSV processing error: ${error.message}`));
        }
    });
};

export default parseCSV;
