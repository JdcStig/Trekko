import express from 'express';
import { spawn } from 'child_process';

const router = express.Router();

// POST /api/run-python
router.post('/', async (req, res) => {
  try {
    // 1) Grab the input from the request body
    const { inputVal } = req.body;

    // 2) Spawn the Python script
    // Adjust the path if your Python script is located elsewhere
    // e.g. if it's in `backend/python/TestPython.py`, do:
    // const pyProcess = spawn('python', ['backend/python/TestPython.py', inputVal]);
    // or 'python3' on some systems
    const pyProcess = spawn('python', ['backend/python/TestPython.py', inputVal]);

    let outputData = '';
    let errorData = '';

    // 3) Collect stdout
    pyProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    // 4) Collect stderr
    pyProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    // 5) When script finishes
    pyProcess.on('close', (code) => {
      if (code === 0) {
        // Parse the JSON output if you like:
        // let parsed = JSON.parse(outputData);
        // or just return the raw string
        res.status(200).json({ output: outputData });
      } else {
        res
          .status(500)
          .json({ message: 'Python script error', error: errorData });
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.toString() });
  }
});

export default router;
