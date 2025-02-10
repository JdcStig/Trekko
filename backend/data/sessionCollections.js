const sessionCollections = [
    {     
        userId: '',
        teamName: "XPX1",
        sessionName: "Session1",
        date: Math.floor(Date.now() / 1000), // Unix timestamp
        number: 1, // Default value
        type: 'Training', // Default dropdown option
        duration: '', 
        avgDistance: '20.0', // Default value
        splits: [
            {
                title: 'Split 1',
                start: '',
                end: ''
            }
        ],
        notes: '',
        sessionData: []
    },
    {
        userId: '',
        teamName: "XPX2",
        sessionName: "Session2",
        date: Math.floor(Date.now() / 1000),
        number: 1,
        type: 'Game',
        duration: '',
        avgDistance: '20.0',
        splits: [
            {
                title: 'Split 1',
                start: '',
                end: ''
            }
        ],
        notes: '',
        sessionData: []
    }
];

export default sessionCollections;
