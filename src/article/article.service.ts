import { Inject, Injectable } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Article } from './entities/article.entity';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ArticleService {
  @InjectEntityManager()
  private entityManager: EntityManager;

  @Inject(RedisService)
  private redisService: RedisService;

  create(createArticleDto: CreateArticleDto) {
    return 'This action adds a new article';
  }

  async view(id: number, userId: string) {
    const res = await this.redisService.hashGet(`article_${id}`);

    if (res.viewCount === undefined) {
      const article = await this.findOne(id);

      article.viewCount++;

      await this.entityManager.update(
        Article,
        { id },
        {
          viewCount: article.viewCount,
        },
      );

      await this.redisService.hashSet(`article_${id}`, {
        viewCount: article.viewCount,
        likeCount: article.likeCount,
        collectCount: article.collectCount,
      });

      await this.redisService.set(`user_${userId}_article_${id}`, 1, 10);

      return article.viewCount;
    } else {
      const flag = await this.redisService.get(`user_${userId}_article_${id}`);

      if (flag) {
        return res.viewCount;
      }

      await this.redisService.hashSet(`article_${id}`, {
        ...res,
        viewCount: +res.viewCount + 1,
      });

      await this.redisService.set(`user_${userId}_article_${id}`, 1, 10);

      return +res.viewCount + 1;
    }
  }

  findAll() {
    return `This action returns all article`;
  }

  async findOne(id: number) {
    return await this.entityManager.findOneBy(Article, {
      id,
    });
  }

  async flushRedisToDB() {
    const keys = await this.redisService.keys(`article_*`);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      const res = await this.redisService.hashGet(key);

      const [_, id] = key.split('_');

      await this.entityManager.update(
        Article,
        {
          id: +id,
        },
        {
          viewCount: +res.viewCount,
        },
      );
    }
  }

  update(id: number, updateArticleDto: UpdateArticleDto) {
    return `This action updates a #${id} article`;
  }

  remove(id: number) {
    return `This action removes a #${id} article`;
  }
}
