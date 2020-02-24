import * as faker from 'faker';
import Configuration from '../../config/Configuration';
import { MetricsContext } from '../../logger/MetricsContext';
import { AgentSink } from '../AgentSink';
import { TcpClient } from '../connections/TcpClient';


test('default endpoint is tcp', () => {
  // arrange
  const logGroupName = faker.random.word();

  // act
  const sink = new AgentSink(logGroupName);

  // assert
  // @ts-ignore
  expect(sink.endpoint.protocol).toBe('tcp:');
  // @ts-ignore
  expect(sink.endpoint.host).toBe('0.0.0.0');
  // @ts-ignore
  expect(sink.endpoint.port).toBe(25888);
});

test('can parse udp endpoints', () => {
  // arrange
  Configuration.agentEndpoint = 'udp://127.0.0.1:1000';
  const logGroupName = faker.random.word();

  // act
  const sink = new AgentSink(logGroupName);

  // assert
  // @ts-ignore
  expect(sink.endpoint.protocol).toBe('udp:');
  // @ts-ignore
  expect(sink.endpoint.host).toBe('127.0.0.1');
  // @ts-ignore
  expect(sink.endpoint.port).toBe(1000);
});

test('handles tcp connection error', async () => {
  // arrange
  const noProcessPort = faker.random.number({ min: 1000, max: 9999 });
  Configuration.agentEndpoint = `tcp://127.0.0.1:${noProcessPort}`;
  const context = MetricsContext.empty();
  const logGroupName = faker.random.word();
  const sink = new AgentSink(logGroupName);

  // assert
  return expect(sink.accept(context)).rejects.toThrowError(/ECONNREFUSED/);
});

test('LogGroup is stored in metadata', async () => {
  // arrange
  const expectedLogGroup = faker.random.alphaNumeric();
  const context = MetricsContext.empty();

  let receivedMessage: any = {};
  TcpClient.prototype.sendMessage = async (message: Buffer) : Promise<void> => {
    receivedMessage = JSON.parse(message.toString('utf8'));
  }

  const sink = new AgentSink(expectedLogGroup);

  // act
  await sink.accept(context);

  // assert
  expect(receivedMessage._aws.LogGroupName).toBe(expectedLogGroup);
});

test('empty LogGroup is not stored in metadata', async () => {
  // arrange
  const context = MetricsContext.empty();

  let receivedMessage: any = {};
  TcpClient.prototype.sendMessage = async (message: Buffer) : Promise<void> => {
    receivedMessage = JSON.parse(message.toString('utf8'));
  }

  const sink = new AgentSink("");

  // act
  await sink.accept(context);

  // assert
  expect(receivedMessage._aws.LogGroupName).toBe(undefined);
});
