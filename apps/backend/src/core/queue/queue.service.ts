import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue, Worker, Job, ConnectionOptions } from 'bullmq'
import { QUEUE_NAMES, type QueueName } from './queue.constants'

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: ConnectionOptions
  private readonly queues = new Map<QueueName, Queue>()

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379')
    const url = new URL(redisUrl)
    this.connection = {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      tls: url.protocol === 'rediss:' ? {} : undefined,
    }

    for (const name of Object.values(QUEUE_NAMES)) {
      this.queues.set(name, new Queue(name, { connection: this.connection }))
    }
  }

  getQueue(name: QueueName): Queue {
    return this.queues.get(name)!
  }

  async add<T>(queueName: QueueName, jobName: string, data: T, opts?: object): Promise<Job<T>> {
    return this.getQueue(queueName).add(jobName, data, opts)
  }

  createWorker<T>(
    queueName: QueueName,
    processor: (job: Job<T>) => Promise<void>,
    concurrency = 5,
  ): Worker<T> {
    return new Worker<T>(queueName, processor, {
      connection: this.connection,
      concurrency,
    })
  }

  async onModuleDestroy() {
    await Promise.all([...this.queues.values()].map((q) => q.close()))
  }
}
