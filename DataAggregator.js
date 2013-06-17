Ext.define('CustomApp.DataAggregator', {

	requires: [
		"Deft.Deferred"
	],

	config: {
		selection : null,
		results   : [],
		teams     : []
	},

	constructor: function(config) {
		this.loadPromise = Ext.create('Deft.Deferred');
		Ext.apply(this, config);
	},

	load: function() {
		var me = this;

		this.dates = this.aggregateDates();
		_.each(this.dates, function(date) {
			me.loadDate(date);
		});

		return this.loadPromise.promise;
	},

	loadDate: function(date) {
		Ext.create('Rally.data.lookback.SnapshotStore', {
			fetch   : ['PlanEstimate','Project','ScheduleState','Iteration'],
			hydrate : ['ScheduleState'],
			filters : [{
					property : '__At',
					value    : date
				},{
					property : '_TypeHierarchy',
					value    : 'HierarchicalRequirement'
				},{
					property : '_ItemHierarchy',
					operator : 'in',
					value    : this.selection.data.id
				},{
					property : 'Iteration',
					operator : '!=',
					value    : null
				},{
					property : 'Children',
					value    : null
				},{
					property : 'PlanEstimate',
					operator : '>',
					value    : 0
				},{
					property : 'Project',
					operator : 'in',
					value    : App.visibleProjects
				}]
		}).load({
			scope: this,
			callback: function(records, operation, success) {
				this.results.push({
					date    : date,
					records : _.filter(records, function(record) {
						return _.indexOf(App.validIterations, record.get('Iteration')) !== -1;
					})
				});
				if (this.results.length === this.dates.length) {
					this.aggregateResults();
					this.loadPromise.resolve();
				}
			}
		});
	},

	aggregateDates: function () {
		var startDate = Rally.util.DateTime.fromIsoString(App.down('#iterationPicker').getRecord().get('StartDate'));
		var endDate = Ext.Date.add(Rally.util.DateTime.fromIsoString(App.down('#iterationPicker').getRecord().get('EndDate')), Ext.Date.DAY, 3);
		var thisDay = startDate;
		var dates = [];
		while (thisDay <= endDate) {
			// if (thisDay.getDay() !== 0 && thisDay.getDay() !== 6) {
				dates.push(Rally.util.DateTime.toIsoString(thisDay));
			// }
			thisDay = Ext.Date.add(thisDay, Ext.Date.DAY, 1);
		}

		return dates;
	},

	aggregateResults: function() {
		var me = this;
		_.each(this.results, function(dateRecord) {
			dateRecord.teams = {};
			dateRecord.TotalPlanEstimate = 0;
			_.each(dateRecord.records, function(record) {
				if (dateRecord.teams[record.get('Project')] === undefined)
					dateRecord.teams[record.get('Project')] = {
						'Initial Version'   : 0,
						'Defined'           : 0,
						'In-Progress'       : 0,
						'Completed'         : 0,
						'Accepted'          : 0
					};
				dateRecord.teams[record.get('Project')][record.get('ScheduleState')] += record.get('PlanEstimate');
				dateRecord.TotalPlanEstimate += record.get('PlanEstimate');
				me.teams.push(record.get('Project'));
			});
		});
	}
});