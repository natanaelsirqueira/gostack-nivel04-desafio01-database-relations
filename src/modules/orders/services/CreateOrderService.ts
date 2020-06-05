import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute(data: IRequest): Promise<Order> {
    const { customer_id, products: productsData } = data;

    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found.');
    }

    const products = await this.productsRepository.findAllById(productsData);

    if (products.length !== productsData.length) {
      throw new AppError('Invalid products provided.');
    }

    const productsDataById = new Map(
      productsData.map(product => [product.id, product]),
    );

    const productsToUpdate: IUpdateProductsQuantityDTO[] = [];

    const orderProducts = products.map(product => {
      const productData = productsDataById.get(product.id);

      if (productData) {
        if (productData.quantity > product.quantity) {
          throw new AppError('Not enough products.');
        }

        productsToUpdate.push({
          id: product.id,
          quantity: product.quantity - productData.quantity,
        });

        return { ...product, quantity: productData.quantity };
      }

      return product;
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts.map(orderProduct => ({
        product_id: orderProduct.id,
        price: orderProduct.price,
        quantity: orderProduct.quantity,
      })),
    });

    await this.productsRepository.updateQuantity(productsToUpdate);

    return order;
  }
}

export default CreateOrderService;
