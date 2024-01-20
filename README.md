Implementation of a faster REST API to use in local environments.  
`Currently only support the Haltestellen Endpoint with JSON and XML.`  
Fahrten and Abfahrten APIs need a diffrent project to get the data in the first place.  

Plus Mode:
Enable it with the ENV Flag `PLUS_MODE=true` you can also add extra logging with `ENABLE_INIT_LOG=true`
All data that Plus mode needs to fetch is handeld with a pool of workers. Set the pool size with `PARALLEL_REQUESTS` default 10.
To enable automatic updates of the data set `AUTOMATIC_BACKGROUND_UPDATE=6` this will update the data over a timespan of 6 hours to reduce load on the original API.
Plus Mode enables the output of data thats not available on the same route in the original API, but i think would make sense:
- "Linienname" in Haltestellen:
    In Plus Mode the Haltestellen Endpoint will return a list of the lines that stops at the stop.
    A few year ago i was toled "Just use the Abfahrten API", but with special scool lines, and night buses this isn´t even possible to give accurate data.
    FastPuls therfor can´t guarantee that the data is accurate, but it consistantly scans for new lines and updates the data automaticly in the backround without negative performance impact.
    You can use the following ENV Flags:
    - `MAX_LINE_AGE` to set the maximum age of a line in days, default is 14 days (Covers most cases)

    Performance for a real world request is about 0.013332/s for PULS, and arround 5497.829617/s for FastPuls. This is about 41 Million Percent faster.
    To get the same data for all stops in a single request, PULS can do about 0.0019/s, while FastPuls can deliver arround 667.190749/s. This is about 35 Million Percent faster.


Performance:  
While the PULS API can take anywhere from 70ms to 4500ms (with a 12ms ping to the server) to respond to a request, FastPuls typically responds within 5ms, even if all stops are requested.  
There is a closed-source version of FastPuls that uses Redis. However, it's slower compared to the pure in-app memory implementation.  

Benchmarks:  
Puls VAG: 20.73 req/s | Duration p(95)=1m0s
<details>
<pre>
checks.........................: 74.46% ✓ 1158      ✗ 397
data_received..................: 12 MB  157 kB/s
data_sent......................: 1.8 MB 25 kB/s
http_req_blocked...............: avg=77.65ms min=0s       med=78.85ms max=123.04ms p(90)=89.59ms p(95)=92.73ms
http_req_connecting............: avg=27.24ms min=0s       med=26.95ms max=50.68ms  p(90)=33.83ms p(95)=37.18ms
http_req_duration..............: avg=40.3s   min=353.57ms med=41.32s  max=1m0s     p(90)=59.93s  p(95)=59.93s
{ expected_response:true }...: avg=33.57s  min=353.57ms med=31.1s   max=58.87s   p(90)=52.25s  p(95)=52.62s
http_req_failed................: 25.53% ✓ 397       ✗ 1158
http_req_receiving.............: avg=23.85µs min=0s       med=0s      max=1.46ms   p(90)=0s      p(95)=0s
http_req_sending...............: avg=9.9µs   min=0s       med=0s      max=1.51ms   p(90)=0s      p(95)=0s
http_req_tls_handshaking.......: avg=50.38ms min=0s       med=50.64ms max=82.56ms  p(90)=58.41ms p(95)=60.87ms
http_req_waiting...............: avg=40.3s   min=353.57ms med=41.32s  max=1m0s     p(90)=59.93s  p(95)=59.93s
http_reqs......................: 1555   20.730588/s
iteration_duration.............: avg=40.38s  min=430.55ms med=41.41s  max=1m0s     p(90)=1m0s    p(95)=1m0s
iterations.....................: 1555   20.730588/s
vus............................: 19     min=19      max=1999
vus_max........................: 2000   min=2000    max=2000
</pre>
</details>
Fast VAG: 5281.13 req/s | Duration p(95)=380.54ms
<details>
<pre>
checks.........................: 100.00% ✓ 237658      ✗ 0
data_received..................: 291 MB  6.5 MB/s
data_sent......................: 38 MB   845 kB/s
http_req_blocked...............: avg=1.96µs   min=0s med=0s       max=1.12ms   p(90)=0s       p(95)=0s
http_req_connecting............: avg=1.26µs   min=0s med=0s       max=1.12ms   p(90)=0s       p(95)=0s
http_req_duration..............: avg=274.46ms min=0s med=319.42ms max=779.63ms p(90)=376.62ms p(95)=380.49ms
{ expected_response:true }...: avg=274.46ms min=0s med=319.42ms max=779.63ms p(90)=376.62ms p(95)=380.49ms
http_req_failed................: 0.00%   ✓ 0           ✗ 237658
http_req_receiving.............: avg=18.2µs   min=0s med=0s       max=18.02ms  p(90)=0s       p(95)=0s
http_req_sending...............: avg=4.09µs   min=0s med=0s       max=1.66ms   p(90)=0s       p(95)=0s
http_req_tls_handshaking.......: avg=0s       min=0s med=0s       max=0s       p(90)=0s       p(95)=0s
http_req_waiting...............: avg=274.44ms min=0s med=319.4ms  max=779.63ms p(90)=376.59ms p(95)=380.48ms
http_reqs......................: 237658  5281.135947/s
iteration_duration.............: avg=274.51ms min=0s med=319.47ms max=780.16ms p(90)=376.66ms p(95)=380.54ms
iterations.....................: 237658  5281.135947/s
vus............................: 45      min=45        max=1998
vus_max........................: 2000    min=2000      max=2000
</pre>
</details>
