describe("projectquery", function () {

  var storage_channel_name, storage_feed_name, simple_query_plan, simple_aggregate_plan, complex_query_plan, complex_aggregate_plan;
  
  beforeEach(function () {
    storage_channel_name = 'power storage';
    storage_input_name = 'in1';
    storage_output_name = 'out1';
    storage_query_table = 'out1_A';
  });

  it("can do simple query", function () {
    var ctx, p, feed_listener, data_event_counter = 0, error_event_counter = 0;

    ctx = BCC.init(BCC_TEST.STORAGE_KEY);
    expect(typeof(ctx)).toBe("object");
  
    p = ctx.project(BCC_TEST.TEST_PROJECT);
    expect(typeof(p)).toBe("object");

    feed_listener = new BCC_TEST.Listener();

    p.feed({
      channel: storage_channel_name,
      name: storage_input_name,
      onopen: feed_listener.onopen,
      onclose: feed_listener.onclose,
      onmsgreceived: feed_listener.onmsgreceived,
      onmsgsent: feed_listener.onmsgsent,
      onerror: feed_listener.onerror
    });

    waitsFor(function() {
      return (0 !== feed_listener.opens);
    }, "feed open", BCC_TEST.TIMEOUT);

    runs(function () {
      for (var i = 0; i != 10; ++i) {
        feed_listener.f.send({
          s : "String",
          n : i,
          d : new Date(),
          l : ["L","i","s","t"],
          m : {"key": "value"},
          b : true
        });
      }
    });

    waitsFor(function () {
      return (10 == feed_listener.out_messages.length);
    }, 'message send', BCC_TEST.TIMEOUT);

    runs(function () {
      setTimeout(function() {
        // plan.query conforms to
        // http://docs.mongodb.org/manual/core/read-operations/

        simple_query_plan = {
          type: 'find',
          query: { n : 3 }
        };

        p.data({
          channel: storage_channel_name,
          name: storage_query_table,
          plan: simple_query_plan,
          ondata: function (data) {
            ++data_event_counter;

            console.dir(data);
          },
          onerror: function (error) {
            ++error_event_counter;

            console.dir(error);
          }
        });
      }, 1e3);
    });

    waitsFor(function () {
      return ((0 !== data_event_counter) || (0 !== error_event_counter));
    }, 'data event', 15e3);

    runs(function () {
      expect(error_event_counter).toEqual(0);
      expect(data_event_counter).not.toBeNull();
      expect(data_event_counter).not.toBeUndefined();
    });
  });

  xit("can do complex query", function() {
    
  });

  xit("can do simple aggregation", function() {
    
  });

  xit("can do complex aggregation", function() {
    
  });

});