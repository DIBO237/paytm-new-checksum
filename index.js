const https = require('https');
const express = require('express');
const env = require('dotenv')
env.config()
/*
 * import checksum generation utility
 * You can get this utility from https://developer.paytm.com/docs/checksum/
 */
const PaytmChecksum = require('./PaytmChecksum');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
  res.send('Paytm server is live');
});

app.post('/createOrder', async (req, res) => {
  try {
    let data = {
      orderId: req.body.orderId,
      customerId: req.body.customerId,
      amount: req.body.amount,
    };
    var paytmParams = {};
    paytmParams.body = {
      requestType: 'Payment',
      mid: process.env.MID,
      orderId: data.orderId,
      callbackUrl: `https://securegw-stage.paytm.in/theia/paytmCallback?ORDER_ID=${data.orderId}`,
      txnAmount: {
        value: data.amount,
        currency: 'INR',
      },
      userInfo: {
        custId: data.customerId,
      },
    };

    /*
     * Generate checksum by parameters we have in body
     * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys
     */
    PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      process.env.MKEY
    ).then(function (checksum) {
      paytmParams.head = {
        signature: checksum,
      };

      var post_data = JSON.stringify(paytmParams);

      var options = {
        /* for Staging */
        hostname: 'securegw-stage.paytm.in' /* for Production */, // hostname: 'securegw.paytm.in',

        port: 443,
        path: `/theia/api/v1/initiateTransaction?mid=EcWTAk01170313958935&orderId=${data.orderId}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': post_data.length,
        },
      };

      var response = '';
      var post_req = https.request(options, function (post_res) {
        post_res.on('data', function (chunk) {
          response += chunk;
        });

        post_res.on('end', function () {
          console.log('Response: ', response);
          const value = JSON.parse(response);
          res.json({
            success: true,
            data,
            value,
          });
        });
      });

      post_req.write(post_data);
      post_req.end();
    });
  } catch (error) {
    res.send(error);
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
