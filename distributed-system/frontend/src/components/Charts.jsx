import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Charts({ stats }) {
  if (!stats) return <div className="panel">Loading charts...</div>;

  const barData = stats.tab_switch_count 
    ? Object.entries(stats.tab_switch_count).map(([name, count]) => ({ name, switches: count }))
    : [];

  const pieData = stats.domains
    ? Object.entries(stats.domains).map(([name, count]) => ({ name, value: count }))
    : [];

  const lineData = [
    { time: '10:00', activity: 20 },
    { time: '10:05', activity: 40 },
    { time: '10:10', activity: 30 },
    { time: '10:15', activity: 70 },
    { time: '10:20', activity: 50 },
    { time: '10:25', activity: 90 },
  ];

  return (
    <div className="charts-panel">
      <div className="chart-container panel">
        <h2>Tab Switches per Machine</h2>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <RechartsTooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
              <Bar dataKey="switches" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-container panel">
        <h2>Domain Usage Distribution</h2>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-container panel">
        <h2>Global Activity Trend</h2>
        <div className="chart-body">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="time" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <RechartsTooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
              <Line type="monotone" dataKey="activity" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
