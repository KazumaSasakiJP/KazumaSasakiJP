# ************************************************
#  サーバー
#  filename : NCServer.py
#  create : 2024/04/11 Kazuma.Sasaki
#  rev.1 : 2024/04/12 Kazuma.Sasaki
# 起動方法　python NCServer.py
# ************************************************
import os
import sys
from urllib.parse import urlparse
from http.server import SimpleHTTPRequestHandler
from http.server import BaseHTTPRequestHandler
from http.server import CGIHTTPRequestHandler
from http.server import HTTPServer
import json
import pigpio #pigpioライブラリをインポートする
import urllib

power = 0
freq = 1000
pi = pigpio.pi()
pwmI_pin = 12 #PWM出力ピンを指定
pwmII_pin = 13 #PWM出力ピンを指定

UPI_pin = 20
DOWNI_pin = 21

UPII_pin = 23
DOWNII_pin = 24

pi.set_mode(UPI_pin, pigpio.OUTPUT) #UP出力ピンを指定
pi.set_mode(DOWNI_pin, pigpio.OUTPUT) #DOWN出力ピンを指定
pi.set_mode(UPII_pin, pigpio.OUTPUT) #UP出力ピンを指定
pi.set_mode(DOWNII_pin, pigpio.OUTPUT) #DOWN出力ピンを指定
freq = int(freq) #PWM周波数をHzで指定

class Handler(CGIHTTPRequestHandler, SimpleHTTPRequestHandler):
    cgi_directories = ["/cgi-bin"]
    def do_POST(self):
        data={}
        statusText = 'NG'
        try:
            parsed_path = urlparse(self.path)
            content_len = int(self.headers.get('content-length'))
            requestBody = self.rfile.read(content_len).decode('UTF-8')
            params = urllib.parse.parse_qs(requestBody)
            if "/power1" == self.path :
                power = float(params["power"][0])
                freq = float(params["freq"][0])

                duty = int(power)

                cnv_dutycycle = int((duty * 1000000 / 100))
                pi.hardware_PWM(pwmI_pin, int(freq), cnv_dutycycle)
                
                data={"power":power, "freq":freq}
                statusText = 'OK'
            elif "/power2" == self.path :
                power = float(params["power"][0])
                freq = float(params["freq"][0])

                duty = int(power)

                cnv_dutycycle = int((duty * 1000000 / 100))
                pi.hardware_PWM(pwmII_pin, int(freq), cnv_dutycycle)
                
                data={"power":power, "freq":freq}
                statusText = 'OK'

            elif "/dir1" == self.path :
                dir = params["dir"][0]

                if(dir == 'OFF'):   # OFF
                    pi.write(UPI_pin, 0)
                    pi.write(DOWNI_pin, 0)
                elif(dir == 'UP'):  # UP
                    pi.write(DOWNI_pin, 0)
                    pi.write(UPI_pin, 1)
                elif(dir == 'DOWN'):  # DOWN
                    pi.write(UPI_pin, 0)
                    pi.write(DOWNI_pin, 1)
                else:           # ERROR
                    pi.write(UPI_pin, 0)        # rev. 1
                    pi.write(DOWNI_pin, 0)      # rev. 1
                
                data={"dir":dir}
                statusText = 'OK'
            elif "/dir2" == self.path :
                dir = params["dir"][0]

                if(dir == 'OFF'):   # OFF
                    pi.write(UPII_pin, 0)
                    pi.write(DOWNII_pin, 0)
                elif(dir == 'UP'):  # UP
                    pi.write(DOWNII_pin, 0)
                    pi.write(UPII_pin, 1)
                elif(dir == 'DOWN'):  # DOWN
                    pi.write(UPII_pin, 0)
                    pi.write(DOWNII_pin, 1)
                else:           # ERROR 
                    pi.write(UPII_pin, 0)       # rev. 1
                    pi.write(DOWNII_pin, 0)     # rev. 1
                
                data={"dir":dir}
                statusText = 'OK'
            else:
                data={}
                statusText = 'NG'
        except Exception as err:
            print(f"Unexpected {err=}, {type(err)=}")
            
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        result = {'data':data, 'statusText':statusText, "urlparse":parsed_path}
        jsonStr = json.dumps(result)
        self.wfile.write(jsonStr.encode())

host = '0.0.0.0'
try:
    port = int(sys.argv[1])
except IndexError:
    port = 8000

httpd = HTTPServer((host, port), Handler)

print('Serving HTTP on %s port %d ...' % (host, port))
httpd.serve_forever()