const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
// 通用的成功响应格式
const successResponse = (data, message = '成功') => {
  return { code: 200, message, result:data };
};

// 通用的错误响应格式
const errorResponse = (message = '错误', code = 500) => {
  return { code, message };
};

// 中间件函数，用于添加通用的返回格式
const responseMiddleware = (req, res, next) => {
  // 重写 res.json() 方法
  res.json = (data, message = '成功') => {
    res.send(successResponse(data, message));
  };

  // 重写 res.error() 方法
  res.error = (message = '错误', code = 500) => {
    res.status(code).send(errorResponse(message, code));
  };

  next();
};
// 创建连接池
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'FlexiSite',
  password: 'janx123666land',
  database: 'FlexiSite',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dialect: 'mysql'
});

// 连接到数据库
pool.getConnection((err, connection) => {
  if (err) {
    console.error('数据库连接失败：', err);
  } else {
    console.log('已成功连接到数据库');

    app.post('/key-value', (req, res) => {
      const insertValues = req.body;
      const isUpdate = !!insertValues.id;
      const columnNames = Object.keys(insertValues).map(key => key === 'key' ? '`key`' : key).join(',');
      const placeholders = Object.keys(insertValues).map(key => (typeof insertValues[key] === 'string' ? '?' : 'CAST(? AS CHAR)')).join(',');
    
      const setValues = Object.keys(insertValues).map(key => `${key === 'key' ? '`key`' : key} = ${typeof insertValues[key] === 'string' ? '?' : 'CAST(? AS CHAR)'}`).join(',');
    
      const query = isUpdate
        ? `UPDATE JSONMaps SET ${setValues} WHERE id = ?`
        : `INSERT INTO JSONMaps (${columnNames}) VALUES (${placeholders})`;
    
      const values = isUpdate ? [...Object.values(insertValues).map(value => typeof value === 'object' ? JSON.stringify(value) : value), insertValues.id] : Object.values(insertValues).map(value => typeof value === 'object' ? JSON.stringify(value) : value);
    
      connection.query(query, values, (err, results) => {
        if (err) {
          console.error(`${isUpdate ? '更新' : '添加'}键值对失败：`, err);
          res.status(500).json(errorResponse(`${isUpdate ? '更新' : '添加'}键值对失败` + err.message, err.code));
        } else {
          res.json(successResponse(insertValues, `${isUpdate ? '更新' : '添加'}键值对成功`));
        }
      });
    });
    // 删除键值对
    app.delete('/key-value/:id', (req, res) => {
      const id = req.params.id;

      const query = 'DELETE FROM JSONMaps WHERE id = ?';
      connection.query(query, [id], (err, results) => {
        if (err) {
          console.error('删除键值对失败：', err);
          res.status(500).json({ error: '删除键值对失败' });
        } else {
          res.json({ message: '键值对已成功删除' });
        }
      });
    });

    app.get('/key-value/query', (req, res) => {
      const { ...conditions } = req.query;
    
      let query = 'SELECT * FROM JSONMaps WHERE ';
      const values = [];
    
      Object.entries(conditions).forEach(([column, value], index) => {
        if (index > 0) {
          query += ' AND ';
        }
        query += `\`${column}\` = ?`;
        values.push(value);
      });
    
      connection.query(query, values, (err, results) => {
        if (err) {
          console.error('查询键值对失败：', err);
          res.status(500).json(errorResponse('查询键值对失败'+err.message, err.code));
        } else {
          res.json(successResponse(results, '查询键值对成功'));
        }
      });
    });
    // 启动服务器
    const port = 3000;
    app.listen(port, () => {
      console.log(`服务器已启动，监听端口 ${port}`);
    });
  }
});

// 在应用程序关闭时关闭连接池
process.on('exit', () => {
  pool.end();
});