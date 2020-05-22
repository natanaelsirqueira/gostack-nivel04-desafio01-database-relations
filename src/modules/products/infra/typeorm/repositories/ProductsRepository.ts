import { getRepository, Repository } from 'typeorm';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({
    name,
    price,
    quantity,
  }: ICreateProductDTO): Promise<Product> {
    const product = this.ormRepository.create({ name, price, quantity });

    await this.ormRepository.save(product);

    return product;
  }

  public async findByName(name: string): Promise<Product | undefined> {
    return this.ormRepository.findOne({ where: { name } });
  }

  public async findAllById(products: IFindProducts[]): Promise<Product[]> {
    return this.ormRepository.findByIds(products.map(product => product.id));
  }

  public async updateQuantity(
    productsToUpdate: IUpdateProductsQuantityDTO[],
  ): Promise<Product[]> {
    const products = await this.ormRepository.findByIds(productsToUpdate);

    const quantitiesById = new Map(
      productsToUpdate.map(product => [product.id, product.quantity]),
    );

    const promises = products.map(async product => {
      const quantity = quantitiesById.get(product.id);

      if (quantity) {
        const updatedProduct = await this.ormRepository.save({
          ...product,
          quantity,
        });

        return updatedProduct;
      }

      return product;
    });

    const updatedProducts = await Promise.all(promises);

    return updatedProducts;
  }
}

export default ProductsRepository;
