import json
import numpy as np
import pandas as pd
import scipy.signal as signal
import warnings

warnings.filterwarnings("ignore")

def debug_log(message):
    print("DEBUG: " + message)

def runAlg(data):
    try:
        allSpeeds = []
        allAccels = []

        for idx, SD in enumerate(data['Sessions']):
            debug_log(f"Processing Session index {idx}")
            speeds = SD['SpeedData']
            debug_log(f"Length of SpeedData in session {idx}: {len(speeds)}")

            if len(speeds) > 0:
                windowLength = 5
                smoothSpeeds = list(signal.savgol_filter(speeds, window_length=windowLength, polyorder=1))
                smoothAccels = [(smoothSpeeds[i + 1] - smoothSpeeds[i]) / 0.1 for i in range(len(smoothSpeeds) - 1)]
                smoothAccels.append(0)

                smoothData = np.column_stack((smoothSpeeds, smoothAccels))
                smoothDataDF = pd.DataFrame(smoothData, columns=['Speed', 'Accel'])

                debug_log(f"Before cleaning, session {idx}: {len(smoothDataDF)} rows")
                smoothDataDF = smoothDataDF[smoothDataDF.Accel > 0]
                smoothDataDF = smoothDataDF[smoothDataDF.Speed < 10]
                debug_log(f"After cleaning, session {idx}: {len(smoothDataDF)} rows")

                if len(smoothDataDF) > 2 * windowLength:
                    smoothDataDF = smoothDataDF.iloc[windowLength:-windowLength]
                    debug_log(f"After trimming, session {idx}: {len(smoothDataDF)} rows")

                allSpeeds.extend(smoothDataDF['Speed'])
                allAccels.extend(smoothDataDF['Accel'])

        numMax = 5
        numGroupings = 35
        arrayHighestOverall = [[0 for _ in range(numMax)] for _ in range(numGroupings)]

        for speed, accel in zip(allSpeeds, allAccels):
            if speed >= 3:
                group = int((speed - 3) / 0.2)
                group = min(group, numGroupings - 1)
                for loop in range(numMax):
                    if accel > arrayHighestOverall[group][loop]:
                        for shift in reversed(range(loop + 1, numMax)):
                            arrayHighestOverall[group][shift] = arrayHighestOverall[group][shift - 1]
                        arrayHighestOverall[group][loop] = accel
                        break

        accelList = [accel for group in arrayHighestOverall for accel in group if accel > 0]
        speedList = [(3 + j * 0.2 + 0.1) for j in range(numGroupings) for _ in range(numMax)]
        speedList = [s for s, a in zip(speedList, [accel for group in arrayHighestOverall for accel in group]) if a > 0]

        if accelList:
            maxAccelLine = np.polyfit(speedList, accelList, 1)
            debug_log(f"Initial polyfit result: slope={maxAccelLine[0]}, intercept={maxAccelLine[1]}")

            residSD = np.std([a - (maxAccelLine[1] + maxAccelLine[0] * s) for a, s in zip(accelList, speedList)])
            accelListFinal = []
            speedListFinal = []
            for a, s in zip(accelList, speedList):
                resid = a - (maxAccelLine[1] + maxAccelLine[0] * s)
                if abs(resid) / residSD <= 2:
                    accelListFinal.append(a)
                    speedListFinal.append(s)

            if accelListFinal:
                maxAccelLine = np.polyfit(speedListFinal, accelListFinal, 1)
                debug_log(f"Final polyfit result: slope={maxAccelLine[0]}, intercept={maxAccelLine[1]}")
        else:
            maxAccelLine = [0, 0]

        V0 = round(-maxAccelLine[1] / maxAccelLine[0], 2) if maxAccelLine[0] != 0 else 0
        maxAccel = round(maxAccelLine[1], 2)

        debug_log(f"Computed V0 (MaxSpeed): {V0}")
        debug_log(f"Computed maxAccel: {maxAccel}")

        return {"MaxSpeed": V0, "MaxAccel": maxAccel}

    except Exception as e:
        debug_log(f"Error: {str(e)}")
        return {"MaxSpeed": 0, "MaxAccel": 0}

# Required AWS Lambda handler
def lambda_handler(event, context):
    debug_log("Lambda invoked")
    result = runAlg(event)
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(result)
    }

