# -*- coding: utf-8 -*-
"""
Created on Tue Mar 25 21:30:08 2025

FV for Jamie and Haroldas. Uses the speeds only and assumes all data is 0.1 seconds apart
Taken from MultipleSessions file with simplifications

General
https://stackoverflow.com/questions/64648380/how-to-pass-json-string-as-a-command-line-argument-using-python
#filesAnalyseJsonString='{"files":["tmp//2023-09-11-K-Miyoshi-Full-Session.csv", "tmp//2023-09-12-K-Miyoshi-Full-Session.csv", "tmp//2023-09-14-K-Miyoshi-Full-Session.csv"]}'
#fileNames = ["2023-09-11-K-Miyoshi-Full-Session", "2023-09-12-K-Miyoshi-Full-Session", "2023-09-14-K-Miyoshi-Full-Session"]
#2023-09-11-K-Miyoshi-Full-Sessionv1:2023-09-12-K-Miyoshi-Full-Sessionv1:2023-09-14-K-Miyoshi-Full-Sessionv1
#os.chdir("C://Users//HP//Documents//Personal//FootballAnalysis//Analysis//PowerForceVelocity//ForceVelocityAnalysis//March2025_Trakko_WorkPlacement")

@author: HP
"""



import os
import csv
import json
import sys
import numpy as np
import pandas as pd
import scipy.signal as signal
import math
import scipy.optimize as optimize
import warnings
warnings.filterwarnings("ignore")


#Note
#Assume data structured as {"Sessions":[{"SpeedData":[2.3, 4.5, 5.6]},{"SpeedData":[4.3, 3.5, 1.6]}]}
#json_input = sys.argv[1]

#speedColumn='Speed'
#subDir="tmp//"


#debug option to see console.logs when ran , for testing purposes

def debug_log(message): #added
    sys.stderr.write("DEBUG: " + message + "\n") #added



def runAlg(data):


    try:
        #Cerate Single Dataframe with Speed/Accel Data
        allSpeeds=[]
        allAccels=[]
        
        for idx, SD in enumerate(data['Sessions']):   # added enumerate to get an index.



            debug_log("Processing Session index " + str(idx)) # added



            speeds = SD['SpeedData']


            debug_log("Length of SpeedData in session " + str(idx) + ": " + str(len(speeds))) #added



            if len(speeds)>0:
                #Add speed values in for missing time points.
                #speeds = np.array(data[speedColumn])
                windowLength=5
                smoothSpeeds = list(signal.savgol_filter(speeds,window_length=windowLength,polyorder=1)) #Averages over half second
                
                smoothAccels=[(smoothSpeeds[i+1]-smoothSpeeds[i])/0.1 for i in range(len(smoothSpeeds)-1)]
                smoothAccels.append(0)
                
           
                #Clean Data
                smoothData = np.column_stack((smoothSpeeds, smoothAccels))
                smoothDataDF = pd.DataFrame(smoothData, columns = ['Speed','Accel'])

                debug_log("Before cleaning, session " + str(idx) + ": " + str(len(smoothDataDF)) + " rows")

                smoothDataDF = smoothDataDF.drop(smoothDataDF[smoothDataDF.Accel<=0].index) 
                smoothDataDF = smoothDataDF.drop(smoothDataDF[smoothDataDF.Speed>=10].index) 

                debug_log("After cleaning, session " + str(idx) + ": " + str(len(smoothDataDF)) + " rows") #added
                
                #Remove the first 10 values due to smoothing which can lead to straight line of values
                if len(smoothDataDF)>2*windowLength:
                    smoothDataDF = smoothDataDF.iloc[windowLength:]
                    smoothDataDF = smoothDataDF.iloc[:len(smoothDataDF)-windowLength]
                    debug_log("After trimming, session " + str(idx) + ": " + str(len(smoothDataDF)) + " rows") #added
                
                allSpeeds.extend(list(smoothDataDF['Speed']))
                allAccels.extend(list(smoothDataDF['Accel']))

                debug_log("Total speeds collected: " + str(len(allSpeeds)))   #added
                debug_log("Total accels collected: " + str(len(allAccels)))   #added
        
        
        #Force Velocity Curve Calculations
        numMax=5
        numGroupings=35
        arrayHighestOverall=[[0 for i in range(numMax)] for j in range(numGroupings)]
        
        for index in range(len(allSpeeds)):
            speed = allSpeeds[index]
            accel = allAccels[index]
            if speed >=3:
                group = int((speed -3)/0.2)
                if group>=numGroupings:
                    group = numGroupings-1
                loop =0	
                while loop<numMax:
                    if accel > arrayHighestOverall[group][loop]:
                        if loop ==(numMax-1):
                            arrayHighestOverall[group][loop] = accel
                        else:
                            for iter in reversed(range(loop+1,numMax)):
                                arrayHighestOverall[group][iter]=arrayHighestOverall[group][iter-1]
                            arrayHighestOverall[group][loop] = accel    
                            loop=numMax
                    loop=loop+1
        
        
        accelList =[]
        for arrayAccels in arrayHighestOverall:
            accelList.extend(arrayAccels)
        
        speedListList = [[(3+ j*0.2 +0.1) for i in range(numMax)] for j in range(numGroupings)]
        speedList =[]
        for arraySpeeds in speedListList:
            speedList.extend(arraySpeeds)
            
        
        #Clean lists
        accelListTemp=[]
        speedListTemp=[]
        for i in range(len(accelList)):
            if accelList[i]>0:
                accelListTemp.append(accelList[i])
                speedListTemp.append(speedList[i])


                #debug_log("Cleaned speeds count: " + str(len(speedListTemp))) #added

                
        if len(accelListTemp)>0:
            
            maxAccelLine = np.polyfit(np.array(speedListTemp), np.array(accelListTemp), 1)


            debug_log("Initial polyfit result: slope=" + str(maxAccelLine[0]) + ", intercept=" + str(maxAccelLine[1])) #added


            #Remove outliers
            countOutliers=0
        
            residVariance=0
            for i in range(len(speedListTemp)):
                residVariance = residVariance+(accelListTemp[i]-maxAccelLine[1]-maxAccelLine[0]*speedListTemp[i])**2
        
            residSD = (residVariance/len(speedListTemp))**0.5
            
            accelListFinal=[]
            speedListFinal=[]
            for i in range(len(speedListTemp)):
                resid = accelListTemp[i]-maxAccelLine[1]-maxAccelLine[0]*speedListTemp[i]
                if abs(resid)/residSD>2: #Remove if more than 2 standard deviations away.
                    countOutliers=countOutliers+1
                else:
                    accelListFinal.append(accelListTemp[i])
                    speedListFinal.append(speedListTemp[i])

                
            
            if len(accelListFinal)>0:
                maxAccelLine = np.polyfit(np.array(speedListFinal), np.array(accelListFinal), 1)


                debug_log("Final polyfit result: slope=" + str(maxAccelLine[0]) + ", intercept=" + str(maxAccelLine[1])) #added
                
            
        else:
            maxAccelLine=[0,0]
        
        V0 = round(-maxAccelLine[1]/maxAccelLine[0],2)
        maxAccel = round(maxAccelLine[1],2)
        
        debug_log("Computed V0 (MaxSpeed): " + str(V0))#added
        debug_log("Computed maxAccel: " + str(maxAccel))#added   


        jsonOut={'MaxSpeed': V0, 'MaxAccel': maxAccel}
        
    except:
        
        jsonOut={'MaxSpeed': 0, 'MaxAccel': 0}
        #writeLog("Processing error")

    finally:

        #print(str(jsonOut).replace("'", '"'))
        print(json.dumps(jsonOut), flush=True) #added


        return jsonOut

if __name__ == "__main__":
   
   
    debug_log("Starting main")#added
    raw_input = sys.stdin.read()  # Read input from stdin  #added
    payload = json.loads(raw_input)  # Parse the input JSON  #added
    debug_log("Payload received for runAlg")  #added
    runAlg(payload)  #added