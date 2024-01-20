Implementation of a faster REST API to use in local environments.  
`Currently only support the Haltestellen Endpoint with JSON and XML.`  
Fahrten and Abfahrten APIs need a diffrent project to get the data in the first place.  

### Data integrity
I try my best to serve the original data i got from PULS, yes this includes randomly lowercase or uppercase "Kennungen" and other things i might not even notice.

### Plus Mode

Activate Plus Mode by setting the environment flag `PLUS_MODE=true`. For additional logging, use `ENABLE_INIT_LOG=true`. Plus Mode's data retrieval is efficiently managed by a worker pool, whose size you can control with `PARALLEL_REQUESTS` (default is 10).

For automatic data updates, set `AUTOMATIC_BACKGROUND_UPDATE=6`. This setting distributes the update requests evenly over a 6-hour timespan to reduce the load on the original API.

Plus Mode offers enhanced data output, providing information not available on the same route in the original API, which I believe is beneficial:

- **"Linienname" in Haltestellen:** In Plus Mode, the Haltestellen Endpoint will return a list of lines that stop at each stop. A few years ago, the suggestion was "Just use the Abfahrten API", but due to special school lines and night buses, this approach does not always yield accurate data. While FastPuls cannot guarantee absolute accuracy, it consistently scans for new lines and updates the data automatically in the background, ensuring minimal impact on performance.
  
  Utilize the following environment flags for further customization:
  - `MAX_LINE_AGE`: Sets the maximum age of a line's data in days, with a default of 14 days (covering most scenarios).

Regarding performance, for a typical request, PULS manages about 0.013332/s, whereas FastPuls achieves approximately 5497.829617/s, which is around 41 million percent faster. To process the same data for all stops in a single request, PULS operates at about 0.0019/s, while FastPuls can handle around 667.190749/s, amounting to about 35 million percent faster.



### Performance  
While the PULS API can take anywhere from 70ms to 4500ms (with a 12ms ping to the server) to respond to a request, FastPuls typically responds within 5ms, even if all stops are requested.  
There is a closed-source version of FastPuls that uses Redis. However, it's slower compared to the pure in-app memory implementation.  

### Benchmarks
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
