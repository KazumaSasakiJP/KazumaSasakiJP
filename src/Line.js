/**********************************************************************
*  本線１本分のコントロール
*  filename : Line.js
*  create : 2024/04/11 Kazuma.Sasaki
**********************************************************************/
import './App.css';
import { AppBar, Button, Grid, IconButton, LinearProgress, Paper, Slider, TextField, Toolbar, Typography, Snackbar, Alert, Box, Tab } from "@mui/material";
import axios from "axios";
import { Fragment, useEffect, useRef, useState } from "react";
import { DEMO_VERSION, FREQ_MAX, FREQ_MIN, POWER_MAX, POWER_MIN } from './Define';
import BoltIcon from '@mui/icons-material/Bolt';
import { green } from '@mui/material/colors';

// var newlineParam;
export const update = (useLineParam, useOutPower, useOutDir, useSnackbar, useContext, powerUrl, dirUrl) => {
    const NextStep = (command, newlineParam) => {
        switch (command) {
            case 'OFF':
            case 'UP':
            case 'DOWN':
                newlineParam.dir = command
                break;
            case 'STOP':
            case 'E':
            case 'B8':
            case 'B7':
            case 'B6':
            case 'B5':
            case 'B4':
            case 'B3':
            case 'B2':
            case 'B1':
            case 'H':
            case 'N':
            case 'F1':
            case 'F2':
            case 'F3':
            case 'F4':
                newlineParam.selectedValue = command
                break;
            default:
                break;
        }
        newlineParam.elapsedTime = 0
        newlineParam.scriptIndex++;
    }

    // 回生
    const NewRegeneration = (diff, newlineParam, scale) => {
        if (newlineParam.power > newlineParam.powerRange[0]) {
            newlineParam.power -= scale * diff;
            if (newlineParam.power < newlineParam.powerRange[0])
                newlineParam.power = newlineParam.powerRange[0]
        }
    }

    // 力行
    const NewPowerRunning = (diff, newlineParam, limit1, limit2, scale1, scale2, scale3) => {
        if (newlineParam.power < limit1)
            newlineParam.power += scale1 * diff;
        else if (newlineParam.power < limit2)
            newlineParam.power += scale2 * (limit2 - newlineParam.power) * diff;
        else
            newlineParam.power -= (scale3 * newlineParam.power * diff);
    }


    const [lineParam, setLineParam] = useLineParam;
    const [outPower, setOutPower] = useOutPower;
    const [outDir, setOutDir] = useOutDir;

    const date = new Date()
    const diff = (Date.now() - lineParam.datetime) / 100.0;

    if (lineParam.scriptMode === true) {
        if (lineParam.scriptIndex < lineParam.scriptArray.length) {
            const command = lineParam.scriptArray[lineParam.scriptIndex].trim();
            if (command.indexOf('P') === 0) {
                lineParam.power = Number(command.slice(1))
            }
            if (command.indexOf('Q') === 0) {
                lineParam.freq = Number(command.slice(1))
            }
            if (command.indexOf('W') === 0) {
                const waitingTime = command.slice(1) * 10
                lineParam.elapsedTime += diff
                if (waitingTime <= lineParam.elapsedTime) {
                    NextStep(command, lineParam)
                }
            } else {
                NextStep(command, lineParam)
            }
        } else {
            lineParam.scriptIndex = 0
        }
    }
    switch (lineParam.selectedValue) {
        case 'STOP':
            lineParam.power = 0;
            lineParam.selectedValue = "H"
            break;
        case 'E':
            if (lineParam.power > lineParam.powerRange[0]) {
                lineParam.power -= 5.0 * diff;
                if (lineParam.power < lineParam.powerRange[0])
                    lineParam.power = lineParam.powerRange[0]
            }
            break;
        case 'B8':
            NewRegeneration(diff, lineParam, 1.0)
            break;
        case 'B7':
            NewRegeneration(diff, lineParam, 0.8)
            break;
        case 'B6':
            NewRegeneration(diff, lineParam, 0.5)
            break;
        case 'B5':
            NewRegeneration(diff, lineParam, 0.4)
            break;
        case 'B4':
            NewRegeneration(diff, lineParam, 0.3)
            break;
        case 'B3':
            NewRegeneration(diff, lineParam, 0.2)
            break;
        case 'B2':
            NewRegeneration(diff, lineParam, 0.1)
            break;
        case 'B1':
            NewRegeneration(diff, lineParam, 0.05)
            break;
        case 'N':
            NewRegeneration(diff, lineParam, 0.001 * lineParam.power)
            break;
        case 'F1':
            NewPowerRunning(diff, lineParam, 20, 30, 0.05, 0.005, 0.0001)
            break;
        case 'F2':
            NewPowerRunning(diff, lineParam, 40, 50, 0.1, 0.005, 0.0001)
            break;
        case 'F3':
            NewPowerRunning(diff, lineParam, 70, 80, 0.2, 0.01, 0.0001)
            break;
        case 'F4':
            NewPowerRunning(diff, lineParam, 100, 100, 0.5, 0.5, 0.0001)
            break;
        default:
            break;
    }

    // 最高速を超えたらカット
    if (lineParam.power > lineParam.powerRange[1])
        lineParam.power = lineParam.powerRange[1];

    // パワー周波数が変わったら出力変更
    if (parseInt(lineParam.power) !== parseInt(outPower.outPower) || parseInt(lineParam.freq) !== parseInt(outPower.outFreq)) {
        console.log("newPower : ", parseInt(lineParam.power), "outPower : ", parseInt(outPower.outPower), "freq : ", parseInt(lineParam.freq), "outFreq : ", parseInt(outPower.outFreq))

        sendPower(useLineParam, useOutPower, useSnackbar, useContext, powerUrl)
        // sendPower();
    }

    // 進行方向が変わったら出力変更
    if (lineParam.dir !== outDir.outDir) {
        console.log("dir : ", lineParam.dir, "outDir : ", outDir.outDir)
        sendDir(useLineParam, useOutDir, useSnackbar, useContext, dirUrl);
    }

    // 時間の退避
    lineParam.datetimeString = date.toLocaleTimeString('ja-JP', { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    lineParam.datetime = date

    // 処理したパラメータの退避
    return lineParam;
}

export const sendPower = (uselineParam, useOutPower, useSnackbar, useContext, powerUrl) => {
    const [lineParam, setLineParam] = uselineParam
    const [outPower, setOutPower] = useOutPower
    const [snackbar, setSnackbar] = useSnackbar
    const [context, setContext] = useContext

    if (DEMO_VERSION === true) {
        setOutPower(prev => { return { ...prev, outPower: lineParam.power } })
    } else {
        if (outPower.sending === false) {
            // drawLed(context, 20, 20, 10, 'lime')
            // setSending(true)
            const params = new URLSearchParams();
            params.append('power', lineParam.power);
            params.append('freq', parseInt(lineParam.freq));

            // setOutPower({ ...outPower, outPower: lineParam.power, outFreq: lineParam.freq })
            setOutPower({ ...outPower, color: 'A400', sending: true })

            axios.post(powerUrl, params)
                .then((response) => {
                    if (response.statusText === 'OK') {
                        setOutPower(prev => { return { ...prev, outPower: response.data.data.power, outFreq: response.data.data.freq } })
                    }
                }).catch((error) => {
                    setSnackbar({ ...snackbar, snackbarMessage: "出力、周波数、設定エラー", openSnackbar: true })
                }).finally(() => {
                    setOutPower(prev => { return { ...prev, color: '900', sending: false } })
                    // drawLed(context, 20, 20, 10, 'darkGreen')
                });
        }
    }
}

export const sendDir = (uselineParam, useOutDir, useSnackbar, useContext, dirUrl) => {
    const [lineParam, setLineParam] = uselineParam
    const [outDir, setOutDir] = useOutDir
    const [snackbar, setSnackbar] = useSnackbar
    const [context, setContext] = useContext

    if (DEMO_VERSION === true) {
        setOutDir(prev => { return { ...prev, outDir: lineParam.dir } })
    } else {
        if (outDir.sending === false) {
            // drawLed(context, 60, 20, 10, 'lime')
            // setLineParam({ ...lineParam, dirSending: true })

            const params = new URLSearchParams();
            params.append('dir', lineParam.dir)

            // setOutDir({ ...outDir, outDir: lineParam.dir })
            setOutDir({ ...outDir, color: 'A400', sending: true })

            axios.post(dirUrl, params)
                .then((response) => {
                    if (response.statusText === 'OK') {
                        setOutDir(prev => { return { ...prev, outDir: response.data.data.dir, color: '900' } })
                    }
                }).catch((error) => {
                    setSnackbar({ ...snackbar, snackbarMessage: "方向、設定エラー", openSnackbar: true })
                    // setOutDir({ ...outDir, color:'900' })
                }).finally(() => {
                    // setLineParam({ ...lineParam, dirSending: false })
                    setOutDir(prev => { return { ...prev, color: '900', sending: false } })
                    // drawLed(context, 60, 20, 10, 'darkGreen')
                });
        }
    }
}


export const drawLed = (ctx, x, y, r, color) => {
    // if (ctx !== null) {
    //   ctx.fillStyle = color;
    //   ctx.beginPath();
    //   ctx.arc(x, y, r, 0, 2 * Math.PI);
    //   ctx.fill();
    // }

    return (
            <Fragment>
                
            </Fragment>
          )
}

export const Line = (props) => {
    const { name, dirUrl, powerUrl, useLineParam, useCount, useOutPower, useOutDir, useSnackbar, useContext } = props

    const [context, setContext] = useContext;
    const [lineParam, setLineParam] = useLineParam;
    const [count, setCount] = useCount;
    const [outPower, setOutPower] = useOutPower;
    const [outDir, setOutDir] = useOutDir;
    const [snackbar, setSnackbar] = useSnackbar;
    // const [lastInput, setLastInput] = useLaseInput;

    const powerMarks = [
        {
            value: POWER_MIN,
            label: '0%',
        },
        {
            value: POWER_MAX,
            label: '100%',
        },
    ];

    const freqMarks = [
        {
            value: FREQ_MIN,
            label: `${FREQ_MIN}Hz`,
        },
        {
            value: FREQ_MAX,
            label: `${FREQ_MAX}Hz`,
        },
    ];

    const freqNormalise = (value) => ((value - FREQ_MIN) * 100) / (FREQ_MAX - FREQ_MIN);

    const handlePowerChange = (event, newValue) => {
        setLineParam({ ...lineParam, power: newValue })
    }

    const handlePowerRangeChange = (event, newValue) => {
        setLineParam({ ...lineParam, powerRange: newValue })
    }

    const handleFreqChange = (event, newValue) => {
        setLineParam({ ...lineParam, freq: newValue })
    }

    const handlePowerClick = () => {
        setLineParam({ ...lineParam, selectedValue: "STOP", scriptMode: false })
    }
    const handleScriptClick = () => {
        const newScriptArray = lineParam.script.split(',')
        setLineParam({ ...lineParam, scriptArray: newScriptArray, scriptIndex: 0, scriptMode: true })
    }

    // useEffect(() => {
    //   const newlineParam = update(lineParam, outPower, outDir, sendPower, sendDir)
    //   setLineParam({ ...newlineParam })
    // }, [count])

    useEffect(() => {
        const canvas = document.getElementById("canvas")
        const canvasContext = canvas.getContext("2d")
        setContext(canvasContext)
    }, [])

    // useEffect(() => {
    //   const interval = setInterval(() => {
    //     setCount(prevCount => prevCount + 1)
    //   }, 100);
    //   return () => clearInterval(interval)
    // }, [])

    return (
        <Fragment >

            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {name}
                    </Typography>
                </Toolbar>
            </AppBar>

            <Grid container spacing={4} sx={{ p: 8 }}>
                <Grid item xs={2}>
                    <Button
                        variant="contained"
                        onClick={handlePowerClick}
                        fullWidth
                    >
                        STOP(停止)
                    </Button>
                </Grid>
                <Grid item xs={2}>
                    <Button
                        variant="contained"
                        onClick={handleScriptClick}
                        fullWidth
                        disabled={lineParam.scriptMode === true}
                    >
                        SCRIPT(スクリプト)
                    </Button>
                </Grid>
                <Grid item xs={1}>
                    <canvas width="10" height="32" id="canvas"></canvas>
                </Grid>
                <Grid item xs={1}>
                    {"出力"}
                    <BoltIcon sx={{ color: green[outPower.color] }}></BoltIcon>
                </Grid>
                <Grid item xs={1}>
                    {"方向"}
                    <BoltIcon sx={{ color: green[outDir.color] }}></BoltIcon>
                </Grid>
                <Grid item xs={5} />
                <Grid item xs={1}>
                    <Paper
                        sx={{ p: 1, bgcolor: 'green', textAlign: 'center' }}
                    >{lineParam.dir}</Paper>
                </Grid>
                <Grid item xs={2}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const dir = "UP"
                            setLineParam({ ...lineParam, dir: dir })
                            // setLastInput({ ...lastInput, dir: dir })
                        }}
                    >
                        UP(上り)
                    </Button>
                </Grid>
                <Grid item xs={2}>
                    <Button
                        variant="contained"
                        onClick={(event) => {
                            const dir = "OFF"
                            setLineParam({ ...lineParam, dir: dir })
                            // setLastInput({ ...lastInput, dir: dir })
                        }}
                        fullWidth
                    >
                        OFF(切る)
                    </Button>
                </Grid>
                <Grid item xs={2}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const dir = "DOWN"
                            setLineParam({ ...lineParam, dir: dir })
                            // setLastInput({ ...lastInput, dir: dir })
                        }}
                    >
                        DOWN(下り)
                    </Button>
                </Grid>
                <Grid item xs={5} />

                <Grid item xs={1}>
                    <Paper
                        sx={{ p: 1, bgcolor: 'green', textAlign: 'center' }}
                    >{lineParam.selectedValue}</Paper>
                </Grid>
                <Grid item xs={1}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "E"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        E(非常)
                    </Button>
                </Grid>

                <Grid item xs={0.5}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "B8"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        B8
                    </Button>
                </Grid>
                <Grid item xs={0.5}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "B7"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        B7
                    </Button>
                </Grid>
                <Grid item xs={0.5}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "B6"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        B6
                    </Button>
                </Grid>
                <Grid item xs={0.5}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "B5"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        B5
                    </Button>
                </Grid>
                <Grid item xs={0.5}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "B4"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        B4
                    </Button>
                </Grid>
                <Grid item xs={0.5}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "B3"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        B3
                    </Button>
                </Grid>
                <Grid item xs={0.5}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "B2"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        B2
                    </Button>
                </Grid>
                <Grid item xs={0.5}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "B1"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        B1
                    </Button>
                </Grid>
                <Grid item xs={1.0}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "N"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        N
                    </Button>
                </Grid>
                <Grid item xs={1}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "F1"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        F1
                    </Button>
                </Grid>
                <Grid item xs={1}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "F2"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        F2
                    </Button>
                </Grid>
                <Grid item xs={1}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "F3"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        F3
                    </Button>
                </Grid>
                <Grid item xs={1}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "F4"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        F4
                    </Button>
                </Grid>

                <Grid item xs={1}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={(event) => {
                            const selectedValue = "H"
                            setLineParam({ ...lineParam, selectedValue: selectedValue })
                            // setLastInput({ ...lastInput, selectedValue: selectedValue })
                        }}
                    >
                        H
                    </Button>
                </Grid>
                <Grid item xs={4} />
                <Grid item xs={12}>
                    出力 : {lineParam.power.toFixed(1)}[%]
                    <LinearProgress
                        sx={{ height: 20, borderRadius: 10 }}
                        variant="determinate"
                        value={outPower.outPower}
                    />
                    <Slider
                        marks={powerMarks}
                        step={1}
                        value={lineParam.power}
                        valueLabelDisplay="auto"
                        min={POWER_MIN}
                        max={POWER_MAX}
                        onChange={handlePowerChange}
                    />
                    範囲[%]
                    <Slider
                        marks={powerMarks}
                        step={1}
                        value={lineParam.powerRange}
                        valueLabelDisplay="auto"
                        min={POWER_MIN}
                        max={POWER_MAX}
                        onChange={handlePowerRangeChange}
                    />
                </Grid>
                <Grid item xs={12}>
                    周波数 : {lineParam.freq}[Hz]
                    <LinearProgress
                        sx={{ height: 20, borderRadius: 10 }}
                        variant="determinate"
                        value={freqNormalise(outPower.outFreq)}
                    />
                    <Slider
                        marks={freqMarks}
                        step={5}
                        value={lineParam.freq}
                        valueLabelDisplay="auto"
                        min={FREQ_MIN}
                        max={FREQ_MAX}
                        onChange={handleFreqChange}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="Script"
                        multiline
                        rows={4}
                        value={lineParam.script}
                        variant="filled"
                        onChange={(event) =>
                            setLineParam({ ...lineParam, script: event.target.value })
                        }
                        fullWidth
                    />
                </Grid>
                <Grid item xs={10} />
                <Grid item xs={2}
                    sx={{ textAlign: 'right' }}
                >
                    {lineParam.datetimeString}
                </Grid>
            </Grid>
            <Snackbar
                open={snackbar.openSnackbar}
                autoHideDuration={6000}
                onClose={(event) => {
                    setSnackbar({ ...snackbar, openSnackbar: false })
                }}
            >
                <Alert
                    onClose={(event) => {
                        setSnackbar({ ...snackbar, openSnackbar: false })
                    }}
                    severity="warning"
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.snackbarMessage}
                </Alert>
            </Snackbar>
        </Fragment >
    );
}