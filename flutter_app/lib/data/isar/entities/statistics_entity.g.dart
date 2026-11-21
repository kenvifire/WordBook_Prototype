// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'statistics_entity.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetStatisticsEntityCollection on Isar {
  IsarCollection<StatisticsEntity> get statisticsEntitys => this.collection();
}

const StatisticsEntitySchema = CollectionSchema(
  name: r'Statistics',
  id: -3012562703602652036,
  properties: {
    r'bookId': PropertySchema(
      id: 0,
      name: r'bookId',
      type: IsarType.string,
    ),
    r'completedAt': PropertySchema(
      id: 1,
      name: r'completedAt',
      type: IsarType.dateTime,
    ),
    r'createdAt': PropertySchema(
      id: 2,
      name: r'createdAt',
      type: IsarType.dateTime,
    ),
    r'pagesRead': PropertySchema(
      id: 3,
      name: r'pagesRead',
      type: IsarType.long,
    ),
    r'startedAt': PropertySchema(
      id: 4,
      name: r'startedAt',
      type: IsarType.dateTime,
    ),
    r'statisticsId': PropertySchema(
      id: 5,
      name: r'statisticsId',
      type: IsarType.string,
    ),
    r'totalPages': PropertySchema(
      id: 6,
      name: r'totalPages',
      type: IsarType.long,
    ),
    r'totalPracticeTime': PropertySchema(
      id: 7,
      name: r'totalPracticeTime',
      type: IsarType.long,
    ),
    r'totalReadingTime': PropertySchema(
      id: 8,
      name: r'totalReadingTime',
      type: IsarType.long,
    ),
    r'totalWords': PropertySchema(
      id: 9,
      name: r'totalWords',
      type: IsarType.long,
    ),
    r'updatedAt': PropertySchema(
      id: 10,
      name: r'updatedAt',
      type: IsarType.dateTime,
    ),
    r'userId': PropertySchema(
      id: 11,
      name: r'userId',
      type: IsarType.string,
    ),
    r'wordsLearned': PropertySchema(
      id: 12,
      name: r'wordsLearned',
      type: IsarType.long,
    ),
    r'wordsMastered': PropertySchema(
      id: 13,
      name: r'wordsMastered',
      type: IsarType.long,
    )
  },
  estimateSize: _statisticsEntityEstimateSize,
  serialize: _statisticsEntitySerialize,
  deserialize: _statisticsEntityDeserialize,
  deserializeProp: _statisticsEntityDeserializeProp,
  idName: r'id',
  indexes: {
    r'statisticsId': IndexSchema(
      id: -3125493840986908233,
      name: r'statisticsId',
      unique: false,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'statisticsId',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    ),
    r'bookId': IndexSchema(
      id: 3567540928881766442,
      name: r'bookId',
      unique: false,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'bookId',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    )
  },
  links: {},
  embeddedSchemas: {},
  getId: _statisticsEntityGetId,
  getLinks: _statisticsEntityGetLinks,
  attach: _statisticsEntityAttach,
  version: '3.1.0+1',
);

int _statisticsEntityEstimateSize(
  StatisticsEntity object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.bookId.length * 3;
  bytesCount += 3 + object.statisticsId.length * 3;
  {
    final value = object.userId;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  return bytesCount;
}

void _statisticsEntitySerialize(
  StatisticsEntity object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeString(offsets[0], object.bookId);
  writer.writeDateTime(offsets[1], object.completedAt);
  writer.writeDateTime(offsets[2], object.createdAt);
  writer.writeLong(offsets[3], object.pagesRead);
  writer.writeDateTime(offsets[4], object.startedAt);
  writer.writeString(offsets[5], object.statisticsId);
  writer.writeLong(offsets[6], object.totalPages);
  writer.writeLong(offsets[7], object.totalPracticeTime);
  writer.writeLong(offsets[8], object.totalReadingTime);
  writer.writeLong(offsets[9], object.totalWords);
  writer.writeDateTime(offsets[10], object.updatedAt);
  writer.writeString(offsets[11], object.userId);
  writer.writeLong(offsets[12], object.wordsLearned);
  writer.writeLong(offsets[13], object.wordsMastered);
}

StatisticsEntity _statisticsEntityDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = StatisticsEntity();
  object.bookId = reader.readString(offsets[0]);
  object.completedAt = reader.readDateTimeOrNull(offsets[1]);
  object.createdAt = reader.readDateTime(offsets[2]);
  object.id = id;
  object.pagesRead = reader.readLong(offsets[3]);
  object.startedAt = reader.readDateTimeOrNull(offsets[4]);
  object.statisticsId = reader.readString(offsets[5]);
  object.totalPages = reader.readLong(offsets[6]);
  object.totalPracticeTime = reader.readLong(offsets[7]);
  object.totalReadingTime = reader.readLong(offsets[8]);
  object.totalWords = reader.readLong(offsets[9]);
  object.updatedAt = reader.readDateTime(offsets[10]);
  object.userId = reader.readStringOrNull(offsets[11]);
  object.wordsLearned = reader.readLong(offsets[12]);
  object.wordsMastered = reader.readLong(offsets[13]);
  return object;
}

P _statisticsEntityDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readString(offset)) as P;
    case 1:
      return (reader.readDateTimeOrNull(offset)) as P;
    case 2:
      return (reader.readDateTime(offset)) as P;
    case 3:
      return (reader.readLong(offset)) as P;
    case 4:
      return (reader.readDateTimeOrNull(offset)) as P;
    case 5:
      return (reader.readString(offset)) as P;
    case 6:
      return (reader.readLong(offset)) as P;
    case 7:
      return (reader.readLong(offset)) as P;
    case 8:
      return (reader.readLong(offset)) as P;
    case 9:
      return (reader.readLong(offset)) as P;
    case 10:
      return (reader.readDateTime(offset)) as P;
    case 11:
      return (reader.readStringOrNull(offset)) as P;
    case 12:
      return (reader.readLong(offset)) as P;
    case 13:
      return (reader.readLong(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _statisticsEntityGetId(StatisticsEntity object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _statisticsEntityGetLinks(StatisticsEntity object) {
  return [];
}

void _statisticsEntityAttach(
    IsarCollection<dynamic> col, Id id, StatisticsEntity object) {
  object.id = id;
}

extension StatisticsEntityQueryWhereSort
    on QueryBuilder<StatisticsEntity, StatisticsEntity, QWhere> {
  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension StatisticsEntityQueryWhere
    on QueryBuilder<StatisticsEntity, StatisticsEntity, QWhereClause> {
  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterWhereClause> idEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterWhereClause>
      idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterWhereClause>
      idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterWhereClause>
      idLessThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterWhereClause> idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterWhereClause>
      statisticsIdEqualTo(String statisticsId) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'statisticsId',
        value: [statisticsId],
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterWhereClause>
      statisticsIdNotEqualTo(String statisticsId) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'statisticsId',
              lower: [],
              upper: [statisticsId],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'statisticsId',
              lower: [statisticsId],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'statisticsId',
              lower: [statisticsId],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'statisticsId',
              lower: [],
              upper: [statisticsId],
              includeUpper: false,
            ));
      }
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterWhereClause>
      bookIdEqualTo(String bookId) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'bookId',
        value: [bookId],
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterWhereClause>
      bookIdNotEqualTo(String bookId) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [],
              upper: [bookId],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [bookId],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [bookId],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [],
              upper: [bookId],
              includeUpper: false,
            ));
      }
    });
  }
}

extension StatisticsEntityQueryFilter
    on QueryBuilder<StatisticsEntity, StatisticsEntity, QFilterCondition> {
  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      bookIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      bookIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      bookIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      bookIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'bookId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      bookIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      bookIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      bookIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      bookIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'bookId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      bookIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'bookId',
        value: '',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      bookIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'bookId',
        value: '',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      completedAtIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'completedAt',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      completedAtIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'completedAt',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      completedAtEqualTo(DateTime? value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'completedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      completedAtGreaterThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'completedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      completedAtLessThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'completedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      completedAtBetween(
    DateTime? lower,
    DateTime? upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'completedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      createdAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      createdAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      createdAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      createdAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'createdAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      pagesReadEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'pagesRead',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      pagesReadGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'pagesRead',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      pagesReadLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'pagesRead',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      pagesReadBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'pagesRead',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      startedAtIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'startedAt',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      startedAtIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'startedAt',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      startedAtEqualTo(DateTime? value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'startedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      startedAtGreaterThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'startedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      startedAtLessThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'startedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      startedAtBetween(
    DateTime? lower,
    DateTime? upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'startedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      statisticsIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'statisticsId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      statisticsIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'statisticsId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      statisticsIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'statisticsId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      statisticsIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'statisticsId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      statisticsIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'statisticsId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      statisticsIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'statisticsId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      statisticsIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'statisticsId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      statisticsIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'statisticsId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      statisticsIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'statisticsId',
        value: '',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      statisticsIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'statisticsId',
        value: '',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalPagesEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'totalPages',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalPagesGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'totalPages',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalPagesLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'totalPages',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalPagesBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'totalPages',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalPracticeTimeEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'totalPracticeTime',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalPracticeTimeGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'totalPracticeTime',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalPracticeTimeLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'totalPracticeTime',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalPracticeTimeBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'totalPracticeTime',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalReadingTimeEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'totalReadingTime',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalReadingTimeGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'totalReadingTime',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalReadingTimeLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'totalReadingTime',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalReadingTimeBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'totalReadingTime',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalWordsEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'totalWords',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalWordsGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'totalWords',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalWordsLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'totalWords',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      totalWordsBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'totalWords',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      updatedAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      updatedAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      updatedAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      updatedAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'updatedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'userId',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'userId',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdEqualTo(
    String? value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'userId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'userId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'userId',
        value: '',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      userIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'userId',
        value: '',
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      wordsLearnedEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'wordsLearned',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      wordsLearnedGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'wordsLearned',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      wordsLearnedLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'wordsLearned',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      wordsLearnedBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'wordsLearned',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      wordsMasteredEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'wordsMastered',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      wordsMasteredGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'wordsMastered',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      wordsMasteredLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'wordsMastered',
        value: value,
      ));
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterFilterCondition>
      wordsMasteredBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'wordsMastered',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }
}

extension StatisticsEntityQueryObject
    on QueryBuilder<StatisticsEntity, StatisticsEntity, QFilterCondition> {}

extension StatisticsEntityQueryLinks
    on QueryBuilder<StatisticsEntity, StatisticsEntity, QFilterCondition> {}

extension StatisticsEntityQuerySortBy
    on QueryBuilder<StatisticsEntity, StatisticsEntity, QSortBy> {
  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByBookId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByBookIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'completedAt', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByCompletedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'completedAt', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByPagesRead() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'pagesRead', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByPagesReadDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'pagesRead', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startedAt', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByStartedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startedAt', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByStatisticsId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'statisticsId', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByStatisticsIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'statisticsId', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByTotalPages() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPages', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByTotalPagesDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPages', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByTotalPracticeTime() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPracticeTime', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByTotalPracticeTimeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPracticeTime', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByTotalReadingTime() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalReadingTime', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByTotalReadingTimeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalReadingTime', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByTotalWords() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWords', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByTotalWordsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWords', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByWordsLearned() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsLearned', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByWordsLearnedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsLearned', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByWordsMastered() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsMastered', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      sortByWordsMasteredDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsMastered', Sort.desc);
    });
  }
}

extension StatisticsEntityQuerySortThenBy
    on QueryBuilder<StatisticsEntity, StatisticsEntity, QSortThenBy> {
  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByBookId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByBookIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'completedAt', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByCompletedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'completedAt', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByPagesRead() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'pagesRead', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByPagesReadDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'pagesRead', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startedAt', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByStartedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startedAt', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByStatisticsId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'statisticsId', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByStatisticsIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'statisticsId', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByTotalPages() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPages', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByTotalPagesDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPages', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByTotalPracticeTime() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPracticeTime', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByTotalPracticeTimeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPracticeTime', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByTotalReadingTime() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalReadingTime', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByTotalReadingTimeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalReadingTime', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByTotalWords() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWords', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByTotalWordsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWords', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByWordsLearned() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsLearned', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByWordsLearnedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsLearned', Sort.desc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByWordsMastered() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsMastered', Sort.asc);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QAfterSortBy>
      thenByWordsMasteredDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsMastered', Sort.desc);
    });
  }
}

extension StatisticsEntityQueryWhereDistinct
    on QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct> {
  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct> distinctByBookId(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'bookId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'completedAt');
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'createdAt');
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByPagesRead() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'pagesRead');
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'startedAt');
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByStatisticsId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'statisticsId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByTotalPages() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'totalPages');
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByTotalPracticeTime() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'totalPracticeTime');
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByTotalReadingTime() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'totalReadingTime');
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByTotalWords() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'totalWords');
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'updatedAt');
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct> distinctByUserId(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'userId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByWordsLearned() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'wordsLearned');
    });
  }

  QueryBuilder<StatisticsEntity, StatisticsEntity, QDistinct>
      distinctByWordsMastered() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'wordsMastered');
    });
  }
}

extension StatisticsEntityQueryProperty
    on QueryBuilder<StatisticsEntity, StatisticsEntity, QQueryProperty> {
  QueryBuilder<StatisticsEntity, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<StatisticsEntity, String, QQueryOperations> bookIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'bookId');
    });
  }

  QueryBuilder<StatisticsEntity, DateTime?, QQueryOperations>
      completedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'completedAt');
    });
  }

  QueryBuilder<StatisticsEntity, DateTime, QQueryOperations>
      createdAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'createdAt');
    });
  }

  QueryBuilder<StatisticsEntity, int, QQueryOperations> pagesReadProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'pagesRead');
    });
  }

  QueryBuilder<StatisticsEntity, DateTime?, QQueryOperations>
      startedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'startedAt');
    });
  }

  QueryBuilder<StatisticsEntity, String, QQueryOperations>
      statisticsIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'statisticsId');
    });
  }

  QueryBuilder<StatisticsEntity, int, QQueryOperations> totalPagesProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'totalPages');
    });
  }

  QueryBuilder<StatisticsEntity, int, QQueryOperations>
      totalPracticeTimeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'totalPracticeTime');
    });
  }

  QueryBuilder<StatisticsEntity, int, QQueryOperations>
      totalReadingTimeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'totalReadingTime');
    });
  }

  QueryBuilder<StatisticsEntity, int, QQueryOperations> totalWordsProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'totalWords');
    });
  }

  QueryBuilder<StatisticsEntity, DateTime, QQueryOperations>
      updatedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'updatedAt');
    });
  }

  QueryBuilder<StatisticsEntity, String?, QQueryOperations> userIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'userId');
    });
  }

  QueryBuilder<StatisticsEntity, int, QQueryOperations> wordsLearnedProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'wordsLearned');
    });
  }

  QueryBuilder<StatisticsEntity, int, QQueryOperations>
      wordsMasteredProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'wordsMastered');
    });
  }
}
