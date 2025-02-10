const sessionDatas = [
    {      
        playerId: 'player1',  // Default value, links to a player in MongoDB
        startTime: '00:00.0',  // Default value, will be taken from CSV later
        endTime: '10:00.0',  // Default value, will be taken from CSV later
        lats: [0.10,0.20,0.30],  // Array of latitude values from the CSV
        lons: [1.0,2.0,3.0],  // Array of longitude values from the CSV
        speeds: ['speeds'],  // Array of speed values from the CSV
    },
    {
        playerId: 'player2',
        startTime: '00:00.0',
        endTime: '10:00.0',
        lats: [0.10,0.20,0.30],
        lons: [1.0,2.0,3.0],
        speeds: ['speeds'],
    }
 ];
 
 export default sessionDatas;
 