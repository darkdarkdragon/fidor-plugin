console.log('+++++++++++++++++++ fidor incoming start');

const SqlMqWorker = require('sql-mq-worker');
const gatewayd = require(process.env.GATEWAYD_PATH || __dirname+'/../../../');

const ExternalTransaction = gatewayd.data.models.externalTransactions;
const GatewayTransaction = gatewayd.data.models.gatewayTransactions;
const RippleTransaction = gatewayd.data.models.rippleTransactions;

console.log('+++++++++++++++++++ fidor incoming start');

var worker = new SqlMqWorker({
  Class: ExternalTransaction,
  predicate: { where: {
    deposit: true,
    status: 'invoice'
  }},
  job: function(deposit, callback) {
    console.log('+++++++++++++++++++ fidor incoming job');
    console.log(deposit);
    //logger.info('deposits:invoice:popped', deposit.toJSON());
    GatewayTransaction.find({ where: {
      external_transaction_id: deposit.id
    }})
      .then(function(gatewaydTransaction) {
        console.log('gatewaydTransaction:');
        console.log(gatewaydTransaction);
        if (!gatewaydTransaction) {
          return deposit.updateAttributes({
            status: 'failed'
          }).complete(callback);
        }
        RippleTransaction.find(gatewaydTransaction.ripple_transaction_id)
          .then(function(rippleTransaction) {
            console.log('rippleTransaction:');
            console.log(rippleTransaction);
            if (!rippleTransaction) {
              return deposit.updateAttributes({
                status: 'failed'
              }).complete(function() {
                gatewaydTransaction.updateAttributes({
                  status: 'failed'
                }).complete(callback);
              });
            }
            rippleTransaction.updateAttributes({
              state: 'outgoing'
            })
              .then(function() {
                return gatewaydTransaction.updateAttributes({
                  state: 'complete'
                })
                  .then(function() {
                    deposit.updateAttributes({
                      status: 'complete'
                    })
                      .complete(callback);
                  })
              })
              .error(callback);
          })
      })
      .error(function(error) {
        deposit.updateAttributes({ status: 'failed' })
          .complete(callback)
      });
  }
});

worker.start();