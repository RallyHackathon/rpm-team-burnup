Ext.define('CustomApp.AreaChart', {

	config: {
		data    : undefined,
		teams   : undefined,
		teamMap : {}
	},

	constructor: function(config) {
		Ext.apply(this, config);
	},

	display: function() {
		if (this.teams.length === 0) {
			App.down('#viewport').removeAll();
			Ext.Msg.alert('Error', 'No accepted work has been found using the selected criteria.');
			return;
		}

		//Get team names from OIDs
		var filter  = [];
		_.each(_.unique(this.teams), function(teamId) {
			filter.push({
				property : 'ObjectID',
				value    : teamId
			});
		});

		Ext.create('Rally.data.WsapiDataStore', {
			model    : 'Project',
			fetch    : ['Name','ObjectID'],
			filters  : Rally.data.QueryFilter.or(filter)
		}).load({
			scope : this,
			callback : function(records, operation, success) {
				var me = this;
				_.each(records, function(record) {
					me.teamMap[record.get('ObjectID')] = record.get('Name');
				});

				me.data.sort(function(a, b) {
					return a.date > b.date ? 1 : a.date < b.date ? -1 : 0;
				});

				//Format date strings
				_.each(me.data, function(dateRecord) {
					dateRecord.date = Ext.Date.format(Rally.util.DateTime.fromIsoString(dateRecord.date), 'M d, Y');
				});

				var series = [{
					name : 'TotalPlanEstimate',
					type : 'line',
					data : _.pluck(me.data, 'TotalPlanEstimate')
				}];

				_.each(_.keys(me.teamMap), function(teamOID) {
					var data = [];
					_.each(me.data, function(dateRecord) {
						var teamEntry = dateRecord.teams[teamOID]
						if (teamEntry !== undefined) {
							data.push(teamEntry.Accepted);
						} else {
							data.push(0);
						}
					});
					series.push({
						name : me.teamMap[teamOID],
						type : 'area',
						data : data
					})
				});

				//Series with no data (all zeros) should be removed
				Ext.Array.each(series, function(entry) {
					shouldRemove = _.all(entry.data, function(dataPoint) {
						return dataPoint === 0;
					});
					if (shouldRemove) {
						Ext.Array.remove(series, entry);
					}
				}, this, true);

				App.down('#viewport').removeAll();
				App.down('#viewport').add({
					xtype       : 'rallychart',
					id          : 'chart',
					chartData   : {
						series     : series,
						categories : _.pluck(me.data, 'date')
					},
					chartConfig : {
						xAxis: {
							plotLines: [{
				                color: '#FF0000',
				                width: 3,
				                dashStyle : 'LongDash',
				                value: series[0].data.length - 4
				            }],
				            labels: {
			                    rotation: -45,
			                    align: 'right',
			                    style: {
			                        fontSize: '13px',
			                        fontFamily: 'Verdana, sans-serif'
			                    }
			                }
						},
			            yAxis: {
			                title: {
			                    text: 'Accepted Plan Estimate'
			                }
			            },
			            chart: {
							width  : Ext.get('viewport').getWidth() - 30,
							height : Ext.getBody().getHeight() - 30
			            },
			            // legend: {
							// align         : 'right',
							// layout        : 'vertical',
							// verticalAlign : 'middle'
			            // },
			            title: {
			                text: '"' + App.down('#rpmTree').getSelectionModel().getSelection()[0].raw.name + '" - ' + App.down('#iterationPicker').getRawValue() + ' - Team Acceptance Trend'
			            },
			            tooltip: {
			                shared: true,
			                valueSuffix: ' Points',
			                headerFormat: '<span style="font-size:16px;font-weight:bold;">{point.key}</span><br/>'
			            },
			            plotOptions: {
			                area: {
			                	trackByArea: true,
			                    stacking: 'normal',
			                    lineColor: '#666666',
			                    lineWidth: 1,
			                    marker: {
			                        lineWidth: 1,
			                        lineColor: '#666666'
			                    },
			                    cursor : 'pointer',
			                    events : {
			                    	click : function() {
			                    		me.showTeamTrend(this.name);
			                    	}
			                    }
			                }
			            }
			        },
			        listeners: {
			        	afterrender: function() {
			        		this.unmask();
			        	}
			        }

				});
			}
		});
	},

	showTeamTrend: function(teamName) {
		var series = [{
			name : 'Initial Version',
			data : []
		},{
			name : 'Defined',
			data : []
		},{
			name : 'In-Progress',
			data : []
		},{
			name : 'Completed',
			data : []
		},{
			name : 'Accepted',
			data : []
		}];

		var teamOID = _.keys(this.teamMap)[_.indexOf(_.values(this.teamMap), teamName)];

		_.each(this.data, function(dateRecord) {
			_.each(_.keys(dateRecord.teams[teamOID]), function(scheduleState) {
				seriesEntry = _.find(series, function(seriesObj) {
					return seriesObj.name === scheduleState;
				});
				seriesEntry.data.push(dateRecord.teams[teamOID][scheduleState]);
			});
		});

		App.popup = Ext.create('Rally.ui.dialog.Dialog', {
			autoShow    : true,
			width       : Ext.getBody().getWidth() - 50,
			height      : Ext.getBody().getHeight() - 50,
			autoScroll  : true,
			closable    : true,
			draggable   : true,
			resizable   : true,
			title       : '',
			items: [{
				xtype       : 'rallychart',
				id          : 'popupChart',
				chartData   : {
					series     : series,
					categories : _.pluck(this.data, 'date')
				},
				chartConfig : {
					xAxis: {
						plotLines: [{
			                color: '#FF0000',
			                width: 3,
			                dashStyle : 'LongDash',
			                value: series[0].data.length - 4
			            }]
					},
		            yAxis: {
		                title: {
		                    text: 'Plan Estimate'
		                }
		            },
		            chart: {
		            	type  : 'area',
		                width : Ext.getBody().getWidth() - 100,
		                height: Ext.getBody().getHeight() - 100
		            },
		            title: {
		                text: '"' + App.down('#rpmTree').getSelectionModel().getSelection()[0].raw.name + '" - "' + teamName + '" - ' + App.down('#iterationPicker').getRawValue() + ' - Schedule State Trend'
		            },
		            tooltip: {
		                shared: true,
		                valueSuffix: ' Points'
		            },
		            plotOptions: {
		                area: {
		                    stacking: 'normal',
		                    lineColor: '#666666',
		                    lineWidth: 1,
		                    marker: {
		                        lineWidth: 1,
		                        lineColor: '#666666'
		                    }
		                }
		            }
		        },
		        listeners: {
		        	afterrender: function() {
		        		this.unmask();
		        	}
		        }
			}],
			listeners: {
				afterrender: function() {
					this.toFront();
					this.focus();
				}
			}
		});
	}

});
