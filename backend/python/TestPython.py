# # -*- coding: utf-8 -*-
# """
# https://stackoverflow.com/questions/36926077/how-to-pass-an-array-to-python-through-command-line
# https://stackoverflow.com/questions/51197551/how-to-pass-an-argument-which-exceeds-length-of-4000-from-javascript-to-python-u

# """

# import sys
# import os
# import warnings
# warnings.filterwarnings("ignore")


# inputVal=sys.argv[1] 

# def runAlg():
    
#     try:
#         jsonOut={'MaxSpeed': int(inputVal)*2, 'MaxAccel': int(inputVal)*10}
        
#     except:
#         jsonOut={'MaxSpeed': 0, 'MaxAccel': 0}
#         #writeLog("Processing error")

#     finally:
#         print(str(jsonOut).replace("'", '"'))
#         return jsonOut
#         #writeLog("Processing complete")
    
# if __name__ == "__main__":
#     runAlg()
# file: TestPython.py



import sys
import json   #converts json to python
import warnings
warnings.filterwarnings("ignore")

def runAlg(data): # data is a list of objects of speeds

    all_speeds = []
    for playerObj in data:
        all_speeds.extend(playerObj.get("speeds", [])) # get speeds from each player object , if not found return empty list e.g if no session exists for that week it will return empty list

    if not all_speeds:
        # so if theres an empty list, return 0 for both values and saves time trying to run calculations
        return {"globalMaxSpeed": 0, "maxAccel": 0}

    # The actual top speed found
    globalMax = max(all_speeds)

    # Double the top speed
    doubledSpeed = globalMax * 2

    tenX = globalMax * 10

    return {
        "globalMaxSpeed": doubledSpeed,
        "maxAccel": len(all_speeds)   

    }

if __name__ == "__main__":
    raw_input = sys.stdin.read()
    payload = json.loads(raw_input)
    speedsData = payload.get("data", [])

    result = runAlg(speedsData)

    print(json.dumps(result))
