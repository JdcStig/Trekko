import fs from 'fs';
import csvParser from 'csv-parser';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import createPlayersFromCSV from './createPlayersFromCSV.js';
import { Readable } from 'stream';
import mongoose from 'mongoose';

// Calculates the distance, topspeed, highspeedRunning and Sprinting
const metricsCalculations = {
    Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000, // in km
    TopSpeed: (values) => Math.max(...values), // max speed (top speed)
    HighSpeedRunning: (values) => (values.filter(v => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000, // in km
    Sprinting: (values) => (values.filter(v => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000 // in km
  };


  const parseCSV = async (fileBuffer, sessionId, userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!fileBuffer || fileBuffer.length === 0) {
                return reject(new Error("Uploaded file is empty."));
            }

            // Validate sessionId is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(sessionId)) {
                return reject(new Error("Invalid session ID."));
            }

            // Detect delimiter
            const fileString = fileBuffer.toString('utf-8');
            let delimiter = ',';
            if (fileString.includes('\t')) delimiter = '\t';
            else if (fileString.includes(';')) delimiter = ';';
            else if (fileString.includes('  ')) delimiter = ' ';

            const stream = Readable.from(fileString);
            const results = [];

            stream
                .pipe(csvParser({ separator: delimiter, trim: true }))
                .on('data', (row) => results.push(row))
                .on('end', async () => {
                    if (results.length === 0) {
                        return reject(new Error("CSV file is empty or not parsed correctly."));
                    }

                    // Check if session exists
                    const session = await Session.findById(sessionId);
                    if (!session) {
                        return reject(new Error(`Session not found: ${sessionId}`));
                    }

                    const playerId = results[0]['Player Display Name'] || "Unknown Player";
                    const startTime = results[0]['Time'] || "00:00:0";
                    const endTime = results[results.length - 1]['Time'] || "00:00:0";

                    // Extract numeric values
                    const lats = results.map(row => parseFloat(row['Lat']) || 0);
                    const lons = results.map(row => parseFloat(row['Lon']) || 0);
                    const speeds = results.map(row => parseFloat(row['Speed (m/s)']) || 0);
                    const heartRates = results.map(row => parseInt(row['Heart Rate (bpm)']) || 0);
                    const accelerationImpulses = results.map(row => parseFloat(row['Instantaneous Acceleration Impulse']) || 0);

                    if (lats.includes(NaN) || lons.includes(NaN) || speeds.includes(NaN)) {
                        return reject(new Error("Invalid numeric data found."));
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
                    await createPlayersFromCSV(sessionId, userId);

                    // Creates session-level metrics
                    const sessionPlayerMetrics = Object.keys(metricsCalculations).map(metric => ({
                        MetricName: metric,
                        Value: metricsCalculations[metric](speeds), // Calculate session metrics
                        Unit: metric === 'TopSpeed' ? 'm/s' : 'km'
                    }));

                    // Creates split-level metrics using time-based filtering
                    const splitPlayerMetrics = session.splits.map((split, index) => {
                        // Filter rows based on split start and end times
                        const splitRows = results.filter(row => {
                            const time = parseTimeToSeconds(row['Time']);
                            return time >= split.start && time <= split.end;
                        });

                        const splitSpeeds = splitRows.map(row => parseFloat(row['Speed (m/s)']) || 0);

                        const splitMetrics = Object.keys(metricsCalculations).map(metric => ({
                            MetricName: metric,
                            Value: metricsCalculations[metric](splitSpeeds),
                            Unit: metric === 'TopSpeed' ? 'm/s' : 'km'
                        }));

                        return { SplitNumber: index + 1, SplitMetrics: splitMetrics };
                    });

                    // Update session
                    await Session.findByIdAndUpdate(
                        sessionId,
                        {
                            $inc: { number: 1 },
                            $addToSet: {
                                sessionPlayerData: {
                                    _id: sessionPlayerData._id,
                                    playerName: sessionPlayerData.playerId,
                                    sessionPlayerMetrics,
                                    splitPlayerMetrics
                                }
                            }
                        },
                        { new: true }
                    );

                    resolve();
                })
                .on('error', (error) => {
                    reject(new Error(`CSV read error: ${error.message}`));
                });
        } catch (error) {
            reject(new Error(`CSV processing error: ${error.message}`));
        }
    });
};

// Helper function to parse HH:MM:SS time format into seconds
const parseTimeToSeconds = (timeStr) => {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return (hours * 3600) + (minutes * 60) + seconds;
};

export default parseCSV;
