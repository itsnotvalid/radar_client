var assert = require('assert'),
    RadarClient = require('../lib/radar_client.js'),
    MockEngine = require('./lib/engine.js'),
    HOUR = 1000 * 60 * 60,
    client;

exports.RadarClient = {
  beforeEach: function() {
    client = new RadarClient(MockEngine);
  },

  afterEach: function() {
    MockEngine.current._written = [];
  },

  '.alloc': {
    'should start the manager': function() {
      var called = false;
      client.manager.start = function() { called = true; };
      client.alloc('foo');
      assert.ok(called);
    },

    'should add the channel name to the hash of users': function() {
      assert.equal(client._users.foo, undefined);
      client.alloc('foo');
      assert.equal(client._users.foo, true);
    },

    'should add a callback for ready if a callback is passed': function() {
      var called = false;

      client.on = function(name, callback) {
        called = true;
        assert.equal(name, 'ready');
        assert.equal(typeof callback, 'function');
      };

      client.alloc('foo', function() {});
      assert.ok(called);
    }
  },

  '.dealloc': {
    'should delete the _users property for a given channel name': function() {
      client.alloc('foo');
      assert.equal(client._users.foo, true);
      client.dealloc('foo');
      assert.equal(client._users.foo, undefined);
    },

    'should call close() on the manager if the are no open channels': function() {
      var called = true;
      client.manager.close = function() { called = true; };
      client.alloc('foo');
      assert.equal(client._users.foo, true);
      client.dealloc('foo');
      assert.equal(client._users.foo, undefined);
      assert.ok(called);
    }
  },

  '.configure': {
    'should not change the configuration if nothing is passed': function() {
      assert.deepEqual(client._configuration, { accountName: '', userId: 0, userType: 0 });
      client.configure();
      assert.deepEqual(client._configuration, { accountName: '', userId: 0, userType: 0 });
    },

    'should store the passed hash as a configuration property': function() {
      client.configure({ accountName: 'test', userId: 123, userType: 2 });
      assert.deepEqual(client._configuration, { accountName: 'test', userId: 123, userType: 2 });
    },

    'should configure the manager with the configuration hash': function() {
      var configuration = { accountName: 'test', userId: 456, userType: 2 }, called = false;

      client.manager.configure = function(hash) {
        called = true;
        assert.deepEqual(hash, configuration);
      };

      client.configure(configuration);
      assert.deepEqual(client._configuration, configuration);
      assert.deepEqual(client._me, configuration);
      assert.ok(called);
    }
  },

  'scopes': {
    '.message should return a scope with the appropriate prefix': function() {
      client.configure({ accountName: 'test' });
      var scope = client.message('chatter/1');
      assert.equal(scope.prefix, 'message:/test/chatter/1');
    },

    '.presence should return a scope with the appropriate prefix': function() {
      client.configure({ accountName: 'test' });
      var scope = client.presence('chatter/1');
      assert.equal(scope.prefix, 'presence:/test/chatter/1');
    },

    '.status should return a scope with the appropriate prefix': function() {
      client.configure({ accountName: 'test' });
      var scope = client.status('chatter/1');
      assert.equal(scope.prefix, 'status:/test/chatter/1');
    }
  },

  '.set': {
    'should call _write() with a set operation definition hash': function() {
      var called = false, callback = function(){};

      client._write = function(hash, fn) {
        called = true;
        assert.deepEqual(hash, {
          op: 'set',
          to: 'status:/test/account/1',
          value: 'whatever',
          key: 123,
          type: 0
        });
        assert.equal(fn, callback);
      };

      client.configure({ accountName: 'test', userId: 123, userType: 0 });
      client.set('status:/test/account/1', 'whatever', callback);
      assert.ok(called);
    }
  },

  '.publish': {
    'should call _write() with a publish operation definition hash': function() {
      var called = false, callback = function(){};

      client._write = function(hash, fn) {
        called = true;
        assert.deepEqual(hash, {
          op: 'publish',
          to: 'status:/test/account/1',
          value: 'whatever'
        });
        assert.equal(fn, callback);
      };

      client.configure({ accountName: 'test', userId: 123, userType: 0 });
      client.publish('status:/test/account/1', 'whatever', callback);
      assert.ok(called);
    }
  },

  '.subscribe': {
    'should call _write() with a subscribe operation definition hash': function() {
      var called = false, callback = function(){};

      client._write = function(hash, fn) {
        called = true;
        assert.deepEqual(hash, {
          op: 'subscribe',
          to: 'status:/test/account/1',
        });
        assert.equal(fn, callback);
      };

      client.configure({ accountName: 'test', userId: 123, userType: 0 });
      client.subscribe('status:/test/account/1', callback);
      assert.ok(called);
    }
  },

  '.unsubscribe': {
    'should call _write() with a unsubscribe operation definition hash': function() {
      var called = false, callback = function(){};

      client._write = function(hash, fn) {
        called = true;
        assert.deepEqual(hash, {
          op: 'unsubscribe',
          to: 'status:/test/account/1',
        });
        assert.equal(fn, callback);
      };

      client.configure({ accountName: 'test', userId: 123, userType: 0 });
      client.unsubscribe('status:/test/account/1', callback);
      assert.ok(called);
    }
  },

  '.get': {
    'should call _write() with a get operation definition hash': function() {
      var called = false;

      client._write = function(hash) {
        called = true;
        assert.deepEqual(hash, {
          op: 'get',
          to: 'status:/test/account/1',
          options: undefined
        });
      };

      client.configure({ accountName: 'test', userId: 123, userType: 0 });
      client.get('status:/test/account/1');
      assert.ok(called);
    },

    'should listen for the next get response operation': function() {
      var called = false;

      client.when = function(operation, fn) {
        called = true;
      };

      client.get('status:/test/account/1', function(){});
      assert.ok(called);
    },

    'should pass a function that will call the callback function for the get response operation with the scope provided': function() {
      var called = false,
          passed = false,
          scope = 'status:/test/account/1',
          message = { to: scope },
          callback = function(msg) {
            passed = true;
            assert.deepEqual(msg, message);
          };

      client.when = function(operation, fn) {
        called = true;
        fn(message);
      };

      client.get(scope, callback);
      assert.ok(called);
      assert.ok(passed);
    },

    'should pass a function that will not call the callback function for a get response operation with a different scope': function() {
      var called = false,
          passed = true,
          message = { to: 'status:/test/account/2' },
          callback = function(msg) {
            passed = false;
          };

      client.when = function(operation, fn) {
        called = true;
        fn(message);
      };

      client.get('status:/test/account/1', callback);
      assert.ok(called);
      assert.ok(passed);
    }
  },

  '.sync': {
    'should call _write() with a sync operation definition hash': function() {
      var called = false;

      client._write = function(hash) {
        called = true;
        assert.deepEqual(hash, {
          op: 'sync',
          to: 'status:/test/account/1',
          options: undefined
        });
      };

      client.configure({ accountName: 'test', userId: 123, userType: 0 });
      client.sync('status:/test/account/1');
      assert.ok(called);
    },

    'with options': {
      'should listen for the next get response operation': function() {
        var called = false;

        client.when = function(operation, fn) {
          called = true;
        };

        client.sync('presence:/test/account/1', { version: 2 }, function(){});
        assert.ok(called);
      },

      'should pass a function that will call the callback function for the get response operation with the scope provided': function() {
        var called = false,
            passed = false,
            scope = 'presence:/test/account/1',
            message = { to: scope },
            callback = function(msg) {
              passed = true;
              assert.deepEqual(msg, message);
            };

        client.when = function(operation, fn) {
          called = true;
          fn(message);
        };

        client.sync(scope, { version: 2 }, callback);
        assert.ok(called);
        assert.ok(passed);
      },

      'should pass a function that will not call the callback function for a get response operation with a different scope': function() {
        var called = false,
            passed = true,
            message = { to: 'presence:/test/account/2' },
            callback = function(msg) {
              passed = false;
            };

        client.when = function(operation, fn) {
          called = true;
          fn(message);
        };

        client.sync('presence:/test/account/1', { version: 2 }, callback);
        assert.ok(called);
        assert.ok(passed);
      }
    },

    'without options on a presence': {
      'should listen for messages on the given scope': function() {
        var called = false,
            scope = 'presence:/test/account/1',
            callback = function() {};

        client.once = function(operation, fn) {
          called = true;
          assert.equal(scope, operation);
          assert.equal(fn, callback);
        };

        client.sync(scope, callback);
        assert.ok(called);
      }
    }
  },

  'internal methods': {
    '._write': {
      'should emit an authenticateMessage event': function() {
        var called = false,
            message = { op: 'something', to: 'wherever:/account/scope/1' };

        client.emit = function(name, data) {
          called = true;
          assert.equal(name, 'authenticateMessage');
          assert.deepEqual(data, message);
        };

        client._write(message);
        assert.ok(called);
      },

      'should register an ack event handler that calls the callback function once the appropriate ack message has been received': function() {
        var called = false,
            passed = false,
            message = { op: 'something', to: 'wherever:/account/scope/1' },
            ackMessage = { value: -2 },
            callback = function(msg) {
              passed = true;
              assert.deepEqual(msg, message);
            };

        client.when = function(name, fn) {
          called = true;
          assert.equal(name, 'ack');
          ackMessage.value = message.ack;
          fn(ackMessage);
        };

        client._write(message, callback);
        assert.ok(called);
        assert.ok(passed);
      },

      'should register an ack event handler that does not call the callback function for ack messages with a different value': function() {
        var called = false,
            passed = true,
            message = { op: 'something', to: 'wherever:/account/scope/1' },
            ackMessage = { value: -2 },
            callback = function(msg) { passed = false; };

        client.when = function(name, fn) {
          called = true;
          assert.equal(name, 'ack');
          fn(message);
        };

        client._write(message, callback);
        assert.ok(called);
        assert.ok(passed);
      }
    },

    '._batch': {
      'should ignore messages without the appropriate properties': {
        'to': function() {
          assert.ok(!client._batch({ value: 'x', time: new Date() / 1000 }));
          assert.deepEqual(client._channelSyncTimes, {});
        },

        'value': function() {
          assert.equal(client._channelSyncTimes.you, undefined);
          assert.ok(!client._batch({ value: 'x', to: 'you' }));
          assert.equal(client._channelSyncTimes.you, undefined);
        },

        'time': function() {
          assert.equal(client._channelSyncTimes.you, undefined);
          assert.ok(!client._batch({ value: 'x', to: 'you' }));
          assert.equal(client._channelSyncTimes.you, undefined);
        }
      },

      'should not ignore messages that have all the appropriate properties': function() {
        var now = new Date(),
            message = {
              to: 'you',
              value: [ '{}', now ],
              time: now
            };

        assert.equal(client._channelSyncTimes.you, undefined);
        assert.notEqual(client._batch(message), false);
        assert.equal(client._channelSyncTimes.you, now);
      },

      'should emit an event named for the "to" property value if there is a time that is greater than the current channelSyncTime': function() {
        var called = false,
            now = new Date(),
            message = {
              to: 'you',
              value: [ '{ "something": 1 }', now ],
              time: now
            };

        client._channelSyncTimes.you = now - HOUR;

        client.emit = function(name, data) {
          called = true;
          assert.equal(name, message.to);
          assert.deepEqual(data, JSON.parse(message.value[0]));
        };

        assert.notEqual(client._batch(message), false);
        assert.equal(client._channelSyncTimes.you, now);
        assert.ok(called);
      }
    },

    '._createManager': {
      'should create a manager that listens for the appropriate events': {
        'enterState': function() {
          var state = 'test',
              called = false;

          client.emit = function(name) {
            called = true;
            assert.equal(name, state);
          };

          client._createManager();
          client.manager.emit('enterState', state);
          assert.ok(called);
        },

        'event': function() {
          var event = 'test',
              called = false;

          client.emit = function(name) {
            called = true;
            assert.equal(name, event);
          };

          client._createManager();
          client.manager.emit('event', event);
          assert.ok(called);
        },

        'connect and create a socket with the appropriate listeners': {
          'open': function() {
            var called = false;

            client._createManager();

            client.manager.can = function(name) {
              return name == 'established';
            };

            client.manager.established = function() {
              called = true;
            };

            client.manager.emit('connect');

            client._socket.emit('open');
            assert.ok(called);
          },

          'close': function() {
            var called = false;

            client._createManager();

            client.manager.close = function() {
              called = true;
            };

            client.manager.emit('connect');

            client._socket.emit('close');
            assert.ok(called);
          },

          'message': function() {
            var called = false,
                message = { test: 1 };

            client._createManager();

            client._messageReceived = function(msg) {
              called = true;
              assert.equal(msg, message);
            };

            client.manager.emit('connect');

            client._socket.emit('message', message);
            assert.ok(called);
          }
        },

        'activate': {
          'and emits "ready"': function() {
            var called = false;

            client.emit = function(name) {
              called = true;
              assert.equal(name, 'ready');
            };

            client._createManager();
            client.manager.emit('activate');
            assert.ok(called);
          },

          'and calls _batchSend()\'s groups of 5 messages that are queued': function() {
            var count = 11,
                called = false;

            while (--count) {
              client._queue({ test: count });
            }

            client._batchSend = function(messages) {
              called = true;
              assert.equal(messages.length, 5);
            };

            client._createManager();
            client.manager.emit('activate');
            assert.ok(called);
          }
        },

        'authenticate': function() {
            //var called = false;

            //client.manager.activate = function() {
              //called = true;
            //};

            //client._createManager();
            //client.manager.emit('authenticate');
            //assert.ok(called);
        }
      }
    },

    '._batchSend': {
      'should asynchronously _write() each of the passed messages individually': function(done) {
        var written = 0,
            messages = [
              { test: 1 },
              { test: 2 },
              { test: 3 }
            ];

        client._write = function(message) {
          assert.deepEqual(message, messages[written]);
          written += 1;

          if (written == messages.length) {
            done();
          }
        };

        client._batchSend(messages);
      }
    },

    '._sendMessage': {
      'should call sendPacket() on the _socket if the manager is activated': function() {
        var called = false,
            message = { test: 1 };

        client.manager.is = function(state) { return state == 'activated'; };

        client._socket = {
          sendPacket: function(name, data) {
            called = true;
            assert.equal(name, 'message');
            assert.equal(data, JSON.stringify(message));
          }
        };

        client._sendMessage(message);
        assert.ok(called);
      },

      'should queue the message if the client has been configured, but is not activated': function() {
        var called = false,
            message = { test: 1 };

        client.configure({});

        client._queue = function(msg) {
          called = true;
          assert.deepEqual(msg, message);
        };

        client._sendMessage(message);
        assert.ok(called);
      },

      'should ignore the message if the client has not been configured': function() {
        var passed = true,
            message = { test: 1 };

        client._queue = function(msg) {
          passed = false;
        };

        assert.ok(!client.manager.hasBeen('configured'));
        client._sendMessage(message);
        assert.ok(passed);
      }
    },

    '._queue': {
      'should push messages onto the front of a queue': function() {
        var message1 = { test: 1 }, message2 = { test: 2 };

        assert.equal(client._queuedMessages, undefined);

        client._queue(message1);
        client._queue(message2);

        assert.deepEqual(client._queuedMessages[0], message2);
        assert.deepEqual(client._queuedMessages[1], message1);
      }
    },

    '._messageReceived': {
      'handles incoming messages from the socket connection for': {
        'err': function() {
          var called = false,
              message = {
                op: 'err',
              },
              json = JSON.stringify(message);

          client.emit = function(name, data) {
            called = true;
            assert.equal(name, message.op);
            message.direction = 'in';
            assert.deepEqual(data, message);
          };

          client._messageReceived(json);
          assert.ok(called);
        },

        'ack': function() {
          var called = false,
              message = {
                op: 'ack',
              },
              json = JSON.stringify(message);

          client.emit = function(name, data) {
            called = true;
            assert.equal(name, message.op);
            message.direction = 'in';
            assert.deepEqual(data, message);
          };

          client._messageReceived(json);
          assert.ok(called);
        },

        'get': function() {
          var called = false,
              message = {
                op: 'get',
              },
              json = JSON.stringify(message);

          client.emit = function(name, data) {
            called = true;
            assert.equal(name, message.op);
            message.direction = 'in';
            assert.deepEqual(data, message);
          };

          client._messageReceived(json);
          assert.ok(called);
        },

        'sync': function() {
          var called = false,
              message = {
                op: 'sync',
              },
              json = JSON.stringify(message);

          client._batch = function(msg) {
            called = true;
            message.direction = 'in';
            assert.deepEqual(msg, message);
          };

          client._messageReceived(json);
          assert.ok(called);
        },

        'everything else': function() {
          var called = false,
              message = {
                op: 'something',
                to: 'wherever'
              },
              json = JSON.stringify(message);

          client.emit = function(name, data) {
            called = true;
            assert.equal(name, message.to);
            message.direction = 'in';
            assert.deepEqual(data, message);
          };

          client._messageReceived(json);
          assert.ok(called);
        }
      }
    }
  }
};

