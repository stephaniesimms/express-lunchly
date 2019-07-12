/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** get the full name for this customer*/

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4
             WHERE id=$5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }

  /** search for customers by search terms and return array of customers */

  static async search(name) {
    if (name.trim() === ""){
      throw new Error("Please enter a name.")
    }

    let searchTerms = name.trim().split(' ');
    if (searchTerms.length === 2) {

      let searchFirst = `%${searchTerms[0]}%`;
      let searchLast = `%${searchTerms[1]}%`

      const results = await db.query(
        `SELECT id, 
           first_name AS "firstName",  
           last_name AS "lastName", 
           phone, 
           notes
         FROM customers
         WHERE (first_name ILIKE $1 AND last_name ILIKE $2)
         OR (first_name ILIKE $2 AND last_name ILIKE $1)
         ORDER BY last_name, first_name`,
        [searchFirst, searchLast]
      );
      return results.rows.map(c => new Customer(c));
    }

    else if (searchTerms.length === 1) {
      let searchTerm = `%${searchTerms[0]}%`;

      const results = await db.query(
        `SELECT id, 
           first_name AS "firstName",  
           last_name AS "lastName", 
           phone, 
           notes
         FROM customers
         WHERE first_name ILIKE $1 OR last_name ILIKE $1
         ORDER BY last_name, first_name`,
        [searchTerm]
      );
      return results.rows.map(c => new Customer(c));
    }

    else{
      throw new Error('Please enter one or two search terms.')
    }
  }

  /** order and select top customers by total reservations */

  static async getTopCustomers(n) {
    const results = await db.query(
      `SELECT customers.id,
        first_name AS "firstName",
        last_name AS "lastName",
        phone,
        customers.notes
      FROM customers
      JOIN reservations ON reservations.customer_id=customers.id
      GROUP BY customers.id
      ORDER BY COUNT(reservations.id) DESC
      LIMIT $1`,
      [n]
    );
    return results.rows.map(c => new Customer(c));
  }

  //** get top reservation counts */

  static async getTopReservations(n){
    const results = await db.query(
      `SELECT COUNT(reservations.id)
      FROM customers
      JOIN reservations ON reservations.customer_id = customers.id
      GROUP BY customers.id
      ORDER BY COUNT(reservations.id) DESC
      LIMIT $1`,
      [n]
    );
    return results.rows.map(c => c.count)
  }
}

module.exports = Customer;
