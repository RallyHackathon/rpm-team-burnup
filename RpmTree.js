(function () {
	Ext.define('CustomApp.RpmTree', {
		init: function() {
		    Ext.create('Rally.data.WsapiDataStore', {
		        autoLoad: true,
		        model: 'PortfolioItem/Initiative',
		        fetch: ['Children','LeafStoryCount','Name','ObjectID'],
		        listeners: {
		            load: function(store, data) {
		                if (data.length == 0) {
		                    App.removeAll();
		                    Ext.getBody().unmask();
		                    Ext.Msg.alert('Error', '<div class="error">This app must be ran within a context which features Initiative Portfolio Items.<br />Please change your project scope and try again.</div>');
		                    return;
		                } else {
		                    var roots = [];
		                    Ext.Array.each(data, function(i) {
		                        roots.push({
		                            name   : i.raw.Name,
		                            text   : '<span class="leafStoryCount">' + i.raw.LeafStoryCount + '</span> - <span class="nodeTitle">' + i.raw.Name + '</span>',
		                            id     : i.raw.ObjectID,
		                            leaf   : i.raw.Children == undefined || i.raw.Children.Count == 0
		                        });
		                    });
		                    roots.sort(function(a, b) {
		                        return a['name'] > b['name'] ? 1 : a['name'] < b['name'] ? -1 : 0;
		                    });
		                    drawTree(roots);
		                }
		            }
		        }
		    });

		    function drawTree(roots) {
		        App.down('#rpmTreeContainer').add({
		            xtype        : 'treepanel',
		            store        : Ext.create('Ext.data.TreeStore', {
		                root: {
		                    expanded: true,
		                    children: roots
		                }
		            }),
		            id           : 'rpmTree',
		            rootVisible  : false,
		            margin       : '-1 0 0 0',
		            border       : 0,
		            listeners    : {
		                beforeitemexpand: function(node) {
		                    if (node.hasChildNodes() === false) { // Child nodes have not been populated yet
		                        Ext.create('Rally.data.WsapiDataStore', {
		                            autoLoad : true,
		                            model    : 'PortfolioItem/' + ((node.get('depth') === 1) ? 'Rollup' : 'Feature'),
		                            filters  : [{
		                                property : 'Parent.ObjectID',
		                                value    : node.raw.id
		                            }],
		                            fetch: ['Children','LeafStoryCount','Name','ObjectID'],
		                            listeners : {
		                                load : function(store, records) {
			                                var children = [];
			                                Ext.Array.each(records, function(record) {
			                                    children.push({
			                                        name   : record.raw.Name,
			                                        text   : '<span class="leafStoryCount">' + record.raw.LeafStoryCount + '</span> - <span class="nodeTitle">' + record.raw.Name + '</span>',
			                                        id     : record.raw.ObjectID,
			                                        leaf   : record.raw.Children == undefined || record.raw.Children.Count == 0
			                                    });
			                                });
			                                Ext.Array.each(children.sort(function(a, b) {
			                                    return a['name'] > b['name'] ? 1 : a['name'] < b['name'] ? -1 : 0;
			                                }), function(n) {
			                                    node.appendChild(n);
			                                });
			                            }
		                            }
		                        });
		                    }
		                },
		                selectionchange: function(model, selected, eOpts) {
		                    App.update(selected[0]);
		                }
		            }
		        });

		    }
		}
	});
})();