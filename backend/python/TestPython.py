# -*- coding: utf-8 -*-
"""
https://stackoverflow.com/questions/36926077/how-to-pass-an-array-to-python-through-command-line
https://stackoverflow.com/questions/51197551/how-to-pass-an-argument-which-exceeds-length-of-4000-from-javascript-to-python-u

"""

# importing module
import sys
import os
import warnings
warnings.filterwarnings("ignore")


inputVal=sys.argv[1] #Include for Server version

def runAlg():
    
    try:
        jsonOut={'MaxSpeed': int(inputVal)*2, 'MaxAccel': int(inputVal)*10}
        
    except:
        jsonOut={'MaxSpeed': 0, 'MaxAccel': 0}
        #writeLog("Processing error")

    finally:
        print(str(jsonOut).replace("'", '"'))
        return jsonOut
        #writeLog("Processing complete")
    
    


if __name__ == "__main__":
    runAlg()
