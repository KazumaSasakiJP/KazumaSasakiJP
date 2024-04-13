/**********************************************************************
 *  スタートアップ
 *  filename : App.js
 *  create : 2024/04/11 Kazuma.Sasaki
 *  rev.1 : 2024/04/12 Kazuma.Sasaki
 **********************************************************************/
import './App.css';
import { AppBar, Toolbar, Typography, Box, Tab } from "@mui/material";
import { TabContext, TabPanel, TabList } from '@mui/lab';
import { Fragment, useEffect, useRef, useState } from "react";
import { Line, sendDir, update } from './Line';
import { FREQ_MIN, FREQ_START, POWER_MAX, POWER_MIN } from './Define';

export default function App() {
  const lineParam = {
    datetimeString:"",
    datetime:Date.now(),
    script:'UP,W10,DOWN,W10,OFF,W10,F1,W10,F2,W10,F3,W10,F4,W10,E',
    scriptArray:null,
    scriptIndex:0,
    elapsedTime:0,
    scriptMode:false,
    dir:'OFF',
    powerRange:[POWER_MIN, POWER_MAX],
    power:POWER_MIN,
    freq:FREQ_START,
    dirSending:false,
    selectedValue:'H',
  }

  const lineName = ["第一本線", "第二本線"]
  const paramSnackbar = {
    openSnackbar:false,
    snackbarMessage:""
  }
  
  const paramOutDir = {
    sending:false,
    outDir:'OFF',
    color:'900',
  }

  const paramOutPower = {
    sending:false,
    outPower:POWER_MIN,
    outFreq:FREQ_MIN,
    color:'900',
  }

  const dirUrl1='/dir1'
  const powerUrl1='/power1'
  const dirUrl2='/dir2'
  const powerUrl2='/power2'
  const refWorker = useRef();
  const useLineParam1 = useState(lineParam);
  const useLineParam2 = useState(lineParam);
  const useOutPower1 = useState(paramOutPower);
  const useOutPower2 = useState(paramOutPower);
  const useOutDir1 = useState(paramOutDir);
  const useOutDir2 = useState(paramOutDir);
  const useCount1 = useState(0);
  const useCount2 = useState(0);
  const useSnackbar1 = useState(paramSnackbar);
  const useSnackbar2 = useState(paramSnackbar);
  const useContext1 = useState(null)
  const useContext2 = useState(null)

  const [tabValue, setTabValue] = useState('1');
  const [count, setCount] = useState(0);

  
  
  useEffect(() => {
    const newlineParam1 = update(useLineParam1, useOutPower1, useOutDir1, useSnackbar1, useContext1, powerUrl1, dirUrl1)
    useLineParam1[1]({ ...newlineParam1 })

    const newlineParam2 = update(useLineParam2, useOutPower2, useOutDir2, useSnackbar2, useContext2, powerUrl2, dirUrl2)
    useLineParam2[1]({ ...newlineParam2 })

  }, [count])

  const handleWorkerMessage = (e) => {
      setCount(prevCount => prevCount + 1)
};



  useEffect(() => {
    if (window.Worker && refWorker.current === undefined) {
      refWorker.current = new Worker(new URL('timer.worker.js', import.meta.url));
      refWorker.current.addEventListener('message', handleWorkerMessage);
      refWorker.current.postMessage({interval:100})
    }

    return () => {
      if (window.Worker && refWorker.current) {
        refWorker.current.postMessage(0)
        refWorker.current.removeEventListener('message', handleWorkerMessage);
        refWorker.current.terminate();
        refWorker.current = undefined;
      }
    };
  }, []);

  useEffect(() => {
    sendDir(useLineParam1, useOutDir1, useSnackbar1, useContext1, dirUrl1);
    sendDir(useLineParam2, useOutDir2, useSnackbar2, useContext2, dirUrl2);
  }, []);

  return (
    <Fragment>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Nゲージ コントローラ Ver 1.01
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ width: '100%', typography: 'body1' }}>
        <TabContext value={tabValue}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <TabList
              onChange={(event, newValue) => { setTabValue(newValue) }}
              aria-label="lab API tabs example">
              <Tab label={lineName[0]} value="1" />
              <Tab label={lineName[1]} value="2" />
            </TabList>
          </Box>
          <TabPanel value="1">
            <Line
              name = {lineName[0]}
              dirUrl={dirUrl1}
              powerUrl={powerUrl1}
              useLineParam = {useLineParam1}
              useOutDir = {useOutDir1}
              useOutPower = {useOutPower1}
              useCount = {useCount1}
              useSnackbar = {useSnackbar1}
              useContext = {useContext1}
            ></Line>
          </TabPanel>
          <TabPanel value="2">
            <Line
              name = {lineName[1]}
              dirUrl={dirUrl2}
              powerUrl={powerUrl2}
              useLineParam = {useLineParam2}
              useOutDir = {useOutDir2}
              useOutPower = {useOutPower2}
              useCount = {useCount2}
              useSnackbar = {useSnackbar2}
              useContext = {useContext2}
            ></Line>
          </TabPanel>
        </TabContext>
      </Box>
    </Fragment>
  )
}
