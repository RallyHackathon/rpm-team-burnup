Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    requires: ['Deft.Deferred'],

    layout:'border',
    defaults: {
        collapsible : true,
        collapsed   : false,
        autoScroll  : true,
        split       : true
    },
    items: [{
        title   : 'Settings',
        id      : 'popout',
        region  : 'west',
        margins : '5 0 0 0',
        width   : 270,
        layout: {
            type  : 'vbox',
            align : 'stretch'
        },
        items: [{
            id      : 'settingsPanel',
            layout  : 'vbox',
            height  : 38,
            border  : 0,
            padding : 5,
            style   : {
                borderBottom  : '1px solid #99BCE8'
            },
            defaults : {
                width      : 270,
                margins    : '3 0 0 0'
            },
            items   : [{
                xtype      : 'rallyiterationcombobox',
                id         : 'iterationPicker',
                listeners  : {
                    ready  : function() {App.updateValidIterations()},
                    change : function() {
                        var selection = App.down('#rpmTree').getSelectionModel().getSelection();
                        App.updateValidIterations();
                        if (selection.length > 0) {
                            App.update(selection[0]);
                        }
                    }
                }
            }]
        },{
            id     : 'rpmTreeContainer',
            layout : 'fit',
            border : 0,
            flex   : 1
        }]
    },{
        id          : 'viewport',
        collapsible : false,
        region      : 'center',
        margins     : '5 0 0 0'
    }],

    launch: function() {
        App = this;
        App.initializeRpmTree();
        App.initializeVisibleProjects();
    },

    initializeRpmTree: function() {
        App.tree = Ext.create('CustomApp.RpmTree');
        App.tree.init();
    },

    initializeVisibleProjects: function() {
        Ext.create('Rally.data.WsapiDataStore', {
            model : 'Project',
            fetch : ['ObjectID'],
            limit : Infinity,
            autoLoad: true,
            listeners : {
                load : function(store, records) {
                    App.visibleProjects = _.map(records, function(record) {
                        return record.get('ObjectID');
                    });
                }
            }
        });
    },

    update: function(selection) {
        Ext.getBody().mask('Loading');
        App.deferred.then({
            success: function() {
                App.dataAggregator = Ext.create('CustomApp.DataAggregator', {
                    selection: selection,
                    results: [],
                    teams: []
                });
                App.dataAggregator.load().then({
                    success: function() {
                        Ext.getBody().unmask();
                        App.createAndDisplayChart();
                    }
                });
            }
        });
    },

    createAndDisplayChart: function() {
        App.chart = Ext.create('CustomApp.AreaChart', {
            data  : App.dataAggregator.getResults(),
            teams : App.dataAggregator.getTeams()
        });
        App.chart.display();
    },

    updateValidIterations: function() {
        App.deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.WsapiDataStore', {
            autoLoad : true,
            limit    : Infinity,
            model    : 'Iteration',
            fetch    : ['Name','ObjectID'],
            filters  : [{
                property : 'Name',
                value    : App.down('#iterationPicker').getRawValue()
            }],
            listeners : {
                load : function(store, records) {
                    App.validIterations = _.map(records, function(record) {
                        return record.get('ObjectID');
                    });
                    App.deferred.resolve();
                }
            }
        });
    }
});